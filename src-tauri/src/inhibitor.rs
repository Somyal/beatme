use zbus::proxy;
use zbus::zvariant::OwnedFd;

#[proxy(
    interface = "org.freedesktop.login1.Manager",
    default_service = "org.freedesktop.login1",
    default_path = "/org/freedesktop/login1"
)]
pub trait LogindManager {
    fn inhibit(
        &self,
        what: &str,
        who: &str,
        why: &str,
        mode: &str,
    ) -> zbus::Result<OwnedFd>;

    #[zbus(signal)]
    fn prepare_for_shutdown(&self, active: bool) -> zbus::Result<()>;
}

pub struct InhibitorManager {
    block_fd: Option<OwnedFd>,
}

impl InhibitorManager {
    pub fn new() -> Self {
        Self { block_fd: None }
    }

    pub async fn inhibit_block(&mut self, app_name: &str, reason: &str) -> Result<(), String> {
        if self.block_fd.is_some() {
            return Ok(());
        }

        let connection = zbus::Connection::system().await.map_err(|e| e.to_string())?;
        let manager = LogindManagerProxy::new(&connection).await.map_err(|e| e.to_string())?;
        
        // Mode is "block" to block shutdown indefinitely until released
        let fd = manager.inhibit("shutdown", app_name, reason, "block").await.map_err(|e| e.to_string())?;
        self.block_fd = Some(fd);
        Ok(())
    }

    pub fn release_block(&mut self) {
        self.block_fd = None;
    }

    pub fn is_block_inhibited(&self) -> bool {
        self.block_fd.is_some()
    }
}
