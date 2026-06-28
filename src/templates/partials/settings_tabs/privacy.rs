//! A module that handles the privacy tab for setting page view in the `websurfx` frontend.

use maud::{html, Markup};

/// A functions that handles the html code for the privacy tab for the settings page.
///
/// # Returns
///
/// It returns the compiled html markup code for the privacy tab.
pub fn privacy() -> Markup {
    html!(
        div class="privacy tab"{
           h1{"Privacy & Security"}
           h3{"Tracking Protection"}
           p class="description"{
               "Enable enhanced tracking protection to prevent search queries from being tracked."
           }
           .privacy_toggle{
               label class="switch"{
                   input type="checkbox" id="enhanced_privacy" name="enhanced_privacy" value="true";
                   span class="slider round"{}
               }
               span class="toggle_label"{"Enhanced Tracking Protection"}
           }
           h3{"Request Randomization"}
           p class="description"{
               "Randomize request timing to prevent timing-based fingerprinting."
           }
           .privacy_toggle{
               label class="switch"{
                   input type="checkbox" id="request_randomization" name="request_randomization" value="true";
                   span class="slider round"{}
               }
               span class="toggle_label"{"Enable Request Randomization"}
           }
           h3{"Search Result Encryption"}
           p class="description"{
               "Encrypt search queries for additional privacy (E2EE)."
           }
           .privacy_toggle{
               label class="switch"{
                   input type="checkbox" id="e2ee_enabled" name="e2ee_enabled" value="true";
                   span class="slider round"{}
               }
               span class="toggle_label"{"Enable E2EE for Search"}
           }
           h3{"Disable External Requests"}
           p class="description"{
               "Prevent loading of external resources (fonts, scripts) for maximum privacy."
           }
           .privacy_toggle{
               label class="switch"{
                   input type="checkbox" id="no_external" name="no_external" value="true";
                   span class="slider round"{}
               }
               span class="toggle_label"{"No External Resources"}
           }
        }
    )
}
