//! The `ecosia` module handles the scraping of results from the Ecosia search engine.

use std::collections::HashMap;

use reqwest::Client;
use reqwest::header::HeaderMap;
use scraper::Html;

use crate::models::aggregation::SearchResult;
use crate::models::engine::{EngineError, EngineResult, SearchEngine};
use error_stack::{Report, ResultExt};
use form_urlencoded::encode;

use super::search_result_parser::SearchResultParser;

/// An Ecosia search engine implementation.
pub struct Ecosia {
    parser: SearchResultParser,
}

impl Ecosia {
    /// Creates the Ecosia parser.
    pub fn new() -> EngineResult<Self> {
        Ok(Self {
            parser: SearchResultParser::new(
                "",
                ".result",
                ".result__title",
                ".result__url",
                ".result__snippet",
            )?,
        })
    }
}

#[async_trait::async_trait]
impl SearchEngine for Ecosia {
    async fn results(
        &self,
        query: &str,
        page: u32,
        user_agent: &str,
        client: &Client,
        _safe_search: u8,
    ) -> EngineResult<Vec<(String, SearchResult)>> {
        let encoded_query = encode(query.as_bytes()).to_string();
        let url = format!(
            "https://www.ecosia.org/search?q={}&page={}",
            encoded_query,
            page + 1
        );

        let header_map = HeaderMap::try_from(&HashMap::from([
            ("User-Agent".to_string(), user_agent.to_string()),
            ("Accept".to_string(), "text/html".to_string()),
            ("Accept-Language".to_string(), "en-US,en;q=0.9".to_string()),
        ]))
        .change_context(EngineError::UnexpectedError)?;

        let document: Html = Html::parse_document(
            &Ecosia::fetch_html_from_upstream(self, &url, header_map, client).await?,
        );

        self.parser
            .parse_for_results(&document, |title, result_url, desc| {
                let clean_url = result_url.inner_html().trim();
                if clean_url.contains("ecosia.org") || clean_url.is_empty() {
                    return None;
                }
                Some(SearchResult::new(
                    title.inner_html().trim(),
                    clean_url,
                    desc.inner_html().trim(),
                    &["ecosia"],
                ))
            })
    }
}
