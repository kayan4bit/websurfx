//! The `you` module handles scraping results from You.com.

use std::collections::HashMap;

use reqwest::Client;
use reqwest::header::HeaderMap;
use scraper::Html;

use crate::models::aggregation::SearchResult;
use crate::models::engine::{EngineError, EngineResult, SearchEngine};
use error_stack::{Report, ResultExt};
use form_urlencoded::encode;

use super::search_result_parser::SearchResultParser;

/// You.com search engine implementation.
pub struct You {
    parser: SearchResultParser,
}

impl You {
    /// Creates the You.com parser.
    pub fn new() -> EngineResult<Self> {
        Ok(Self {
            parser: SearchResultParser::new(
                "",
                ".result",
                "h3",
                ".url",
                ".description",
            )?,
        })
    }
}

#[async_trait::async_trait]
impl SearchEngine for You {
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
            "https://search.brave.com/search?q={}&offset={}",
            encoded_query,
            page * 10
        );

        let header_map = HeaderMap::try_from(&HashMap::from([
            ("User-Agent".to_string(), user_agent.to_string()),
            ("Accept".to_string(), "text/html".to_string()),
        ]))
        .change_context(EngineError::UnexpectedError)?;

        let document: Html = Html::parse_document(
            &You::fetch_html_from_upstream(self, &url, header_map, client).await?,
        );

        self.parser
            .parse_for_results(&document, |title, result_url, desc| {
                Some(SearchResult::new(
                    title.inner_html().trim(),
                    result_url.inner_html().trim(),
                    desc.inner_html().trim(),
                    &["you"],
                ))
            })
    }
}
