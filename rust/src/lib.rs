//! Bounded, deterministic passage lookup. A match identifies text, not competence.
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fmt;

const STOP: &str = "a an the and or of in on to for with from my i we our is was are this that as by at work experience skills knowledge ability preferred required practical hands good strong";

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub requirements: Vec<String>,
    pub sources: Vec<Source>,
}
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Source {
    pub id: String,
    pub text: String,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    pub requirement: String,
    pub source_id: Option<String>,
    pub quote: Option<String>,
    pub matched_terms: Vec<String>,
}
#[derive(Debug, Serialize)]
pub struct Response {
    pub findings: Vec<Finding>,
}
#[derive(Debug, PartialEq, Eq)]
pub struct InvalidRequest(pub &'static str);
impl fmt::Display for InvalidRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.0)
    }
}
impl std::error::Error for InvalidRequest {}

fn normalize(term: &str) -> &str {
    match term {
        "pipelines" => "pipeline",
        "tests" => "test",
        "cells" => "cell",
        "experiments" => "experiment",
        "protocols" => "protocol",
        "records" => "record",
        "reproducibility" => "reproducible",
        _ => term,
    }
}
fn terms(text: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric() && c != '+' && c != '#')
        .map(normalize)
        .filter(|s| s.chars().count() > 2 && !STOP.split_whitespace().any(|stop| stop == *s))
        .filter(|s| seen.insert((*s).to_owned()))
        .map(str::to_owned)
        .collect()
}
// Slices borrow the source. Trimming and sentence splitting never rewrite a quotation.
fn passages(text: &str) -> Vec<&str> {
    let mut result = Vec::new();
    let mut start = 0;
    let mut previous = ' ';
    for (index, character) in text.char_indices() {
        if character == '\n' || (character.is_whitespace() && matches!(previous, '.' | '!' | '?')) {
            let passage = text[start..index].trim();
            if !passage.is_empty() {
                result.push(passage);
            }
            start = index + character.len_utf8();
        }
        previous = character;
    }
    let last = text[start..].trim();
    if !last.is_empty() {
        result.push(last);
    }
    result
}

pub fn retrieve(request: &Request) -> Result<Response, InvalidRequest> {
    if request.requirements.is_empty() || request.requirements.len() > 12 {
        return Err(InvalidRequest("Expected 1 to 12 requirements"));
    }
    if request
        .requirements
        .iter()
        .any(|r| r.trim().is_empty() || r.chars().count() > 200)
    {
        return Err(InvalidRequest("Invalid requirement length"));
    }
    if request.sources.len() > 22 {
        return Err(InvalidRequest("Too many sources"));
    }
    let mut ids = HashSet::new();
    for source in &request.sources {
        if source.id.is_empty() || source.id.len() > 200 || !ids.insert(&source.id) {
            return Err(InvalidRequest("Invalid or duplicate source ID"));
        }
        if source.text.chars().count() > 18000 {
            return Err(InvalidRequest("Source too long"));
        }
    }
    // Files and notes precede self-descriptions when coverage is tied. Stable order
    // makes repeated requests identical; no sorting of people takes place.
    let mut ordered: Vec<&Source> = request.sources.iter().collect();
    ordered.sort_by_key(|s| matches!(s.id.as_str(), "profile" | "conversation"));
    let indexed: Vec<_> = ordered
        .into_iter()
        .flat_map(|s| {
            passages(&s.text).into_iter().map(move |p| {
                (
                    s.id.as_str(),
                    p,
                    terms(p).into_iter().collect::<HashSet<_>>(),
                )
            })
        })
        .collect();
    let findings = request
        .requirements
        .iter()
        .map(|requirement| {
            let needles = terms(requirement);
            let mut best: Option<(&str, &str, Vec<String>, bool)> = None;
            for (id, passage, haystack) in &indexed {
                let hits: Vec<_> = needles
                    .iter()
                    .filter(|term| haystack.contains(*term))
                    .cloned()
                    .collect();
                if hits.is_empty() {
                    continue;
                }
                let contextual = passage.split_whitespace().count() >= 9;
                let better = best.as_ref().is_none_or(|(_, _, previous, prior_context)| {
                    (hits.len(), contextual) > (previous.len(), *prior_context)
                });
                if better {
                    best = Some((id, passage, hits, contextual));
                }
            }
            match best {
                Some((id, quote, matched_terms, _)) => Finding {
                    requirement: requirement.clone(),
                    source_id: Some(id.to_owned()),
                    quote: Some(quote.to_owned()),
                    matched_terms,
                },
                None => Finding {
                    requirement: requirement.clone(),
                    source_id: None,
                    quote: None,
                    matched_terms: Vec::new(),
                },
            }
        })
        .collect();
    Ok(Response { findings })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(requirement: &str, sources: &[(&str, &str)]) -> Request {
        Request {
            requirements: vec![requirement.into()],
            sources: sources
                .iter()
                .map(|(id, text)| Source {
                    id: (*id).into(),
                    text: (*text).into(),
                })
                .collect(),
        }
    }
    #[test]
    fn returns_exact_unicode_passage() {
        let text = "Background. I used CRISPR-Cas9 in José’s lab to study β-cells.\nNext step.";
        let result = retrieve(&request("CRISPR cells", &[("paper", text)])).unwrap();
        let found = &result.findings[0];
        assert_eq!(
            found.quote.as_deref(),
            Some("I used CRISPR-Cas9 in José’s lab to study β-cells.")
        );
        assert!(text.contains(found.quote.as_ref().unwrap()));
        assert_eq!(found.matched_terms, vec!["crispr", "cell"]);
    }
    #[test]
    fn whole_words_avoid_substring_matches() {
        let found = retrieve(&request(
            "Java",
            &[("work", "I built a JavaScript application.")],
        ))
        .unwrap();
        assert!(found.findings[0].quote.is_none());
    }
    #[test]
    fn related_work_wins_equal_coverage() {
        let result = retrieve(&request(
            "PCR",
            &[
                (
                    "profile",
                    "I used PCR to measure the results of our research.",
                ),
                (
                    "paper",
                    "We used PCR to measure samples from the cell culture.",
                ),
            ],
        ))
        .unwrap();
        assert_eq!(result.findings[0].source_id.as_deref(), Some("paper"));
    }
    #[test]
    fn preserves_negation_without_claiming_experience() {
        let result = retrieve(&request(
            "CRISPR",
            &[("profile", "I have no CRISPR experience.")],
        ))
        .unwrap();
        assert_eq!(
            result.findings[0].quote.as_deref(),
            Some("I have no CRISPR experience.")
        );
    }
    #[test]
    fn empty_or_stopword_requirement_never_invents_evidence() {
        let result = retrieve(&request(
            "experience with",
            &[("paper", "Many things happened.")],
        ))
        .unwrap();
        assert!(result.findings[0].quote.is_none());
        assert!(retrieve(&request("", &[])).is_err());
    }
    #[test]
    fn duplicate_source_ids_and_oversized_inputs_rejected() {
        assert!(retrieve(&request("PCR", &[("same", "One"), ("same", "Two")])).is_err());
        assert!(retrieve(&request("PCR", &[("paper", &"x".repeat(18001))])).is_err());
    }
    #[test]
    fn stable_order_and_no_punctuation_rewriting() {
        let input = request(
            "PCR",
            &[("first", "PCR: first! Next."), ("second", "PCR: second.")],
        );
        let first = serde_json::to_string(&retrieve(&input).unwrap()).unwrap();
        assert_eq!(
            first,
            serde_json::to_string(&retrieve(&input).unwrap()).unwrap()
        );
        assert_eq!(
            retrieve(&input).unwrap().findings[0].quote.as_deref(),
            Some("PCR: first!")
        );
    }
}
