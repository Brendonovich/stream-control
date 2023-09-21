use std::sync::atomic::AtomicU32;
use std::{collections::HashMap, future::Future, pin::Pin};

pub use reqwest;
use reqwest::Response;
use tauri::async_runtime::Mutex;
use tauri::{AppHandle, Manager, Runtime};

pub use error::{Error, Result};

mod commands;
mod config;
mod error;

pub use commands::*;

type RequestId = u32;
type CancelableResponseResult = Result<Result<reqwest::Response>>;
type CancelableResponseFuture =
    Pin<Box<dyn Future<Output = CancelableResponseResult> + Send + Sync>>;
type RequestTable = HashMap<RequestId, FetchRequest>;
type ResponseTable = HashMap<RequestId, Response>;

struct FetchRequest(Mutex<CancelableResponseFuture>);
impl FetchRequest {
    fn new(f: CancelableResponseFuture) -> Self {
        Self(Mutex::new(f))
    }
}

struct Http<R: Runtime> {
    #[allow(dead_code)]
    app: AppHandle<R>,
    current_id: AtomicU32,
    requests: Mutex<RequestTable>,
    responses: Mutex<ResponseTable>,
}

impl<R: Runtime> Http<R> {
    fn next_id(&self) -> RequestId {
        self.current_id
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    }
}

trait HttpExt<R: Runtime> {
    fn http(&self) -> &Http<R>;
}

impl<R: Runtime, T: Manager<R>> HttpExt<R> for T {
    fn http(&self) -> &Http<R> {
        self.state::<Http<R>>().inner()
    }
}
