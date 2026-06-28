//! The `google` module handles the scraping of results from the Google search engine.

use std::collections::HashMap;

use reqwest::Client;
use reqwest::header::HeaderMap;
use scraper::Html;

use crate::models::aggregation::SearchResult;
use crate::models::engine::{EngineError, EngineResult, SearchEngine};
use error_stack::{Report, ResultExt};
use form_urlencoded::encode;

use super::search_result_parser::SearchResultParser;

/// A Google search engine implementation.
pub struct Google {
    parser: SearchResultParser,
}

impl Google {
    /// Creates the Google parser.
    pub fn new() -> EngineResult<Self> {
        Ok(Self {
            parser: SearchResultParser::new(
                "",
                ".g",
                ".DKV1Dd a",
                ".g > div > div > div > div > a",
                ".g > div > div > div:nth-child(2)",
            )?,
        })
    }
}

#[async_trait::async_trait]
impl SearchEngine for Google {
    async fn results(
        &self,
        query: &str,
        page: u32,
        user_agent: &str,
        client: &Client,
        safe_search: u8,
    ) -> EngineResult<Vec<(String, SearchResult)>> {
        let start = page * 10;
        let encoded_query = encode(query.as_bytes()).to_string();
        let url = format!(
            "https://www.google.com/search?q={}&start={}&safe={}",
            encoded_query,
            start,
            safe_search
        );

        let header_map = HeaderMap::try_from(&HashMap::from([
            ("User-Agent".to_string(), user_agent.to_string()),
            ("Accept".to_string(), "text/html".to_string()),
            ("Accept-Language".to_string(), "en-US,en;q=0.9".to_string()),
        ]))
        .change_context(EngineError::UnexpectedError)?;

        let document: Html = Html::parse_document(
            &Google::fetch_html_from_upstream(self, &url, header_map, client).await?,
        );

        self.parser
            .parse_for_results(&document, |title, result_url, desc| {
                let clean_url = result_url.inner_html().trim();
                if clean_url.contains("google.com") || clean_url.is_empty() {
                    return None;
                }
                Some(SearchResult::new(
                    title.inner_html().trim(),
                    clean_url,
                    desc.inner_html().trim(),
                    &["google"],
                ))
            })
    }
}
