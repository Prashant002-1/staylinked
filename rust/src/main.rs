use staylinked_evidence::{Request, retrieve};
use std::io::{self, Read, Write};
use std::process::ExitCode;
const MAX_INPUT_BYTES: u64 = 2_000_000;
fn run() -> Result<(), Box<dyn std::error::Error>> {
    let mut input = Vec::new();
    io::stdin()
        .lock()
        .take(MAX_INPUT_BYTES + 1)
        .read_to_end(&mut input)?;
    if input.len() as u64 > MAX_INPUT_BYTES {
        return Err("Input exceeds 2 MB".into());
    }
    let request: Request = serde_json::from_slice(&input)?;
    let response = retrieve(&request)?;
    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, &response)?;
    stdout.write_all(b"\n")?;
    Ok(())
}
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("evidence lookup failed: {error}");
            ExitCode::FAILURE
        }
    }
}
