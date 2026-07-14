# Deploying Office Automation on Ubuntu 24.04 LTS

This guide outlines the steps to package the application on Windows, transfer it to your Ubuntu 24.04 LTS target system, run the automated installation, and manage the background server.

---

## 1. Package the Application on Windows

To prepare the folder for transfer, compress the codebase into a `.zip` or `.tar.gz` archive. 

> [!IMPORTANT]
> **Exclude `node_modules`** from the archive! This ensures that all dependency binaries (such as PostgreSQL drivers) compile natively on the target Ubuntu system, avoiding CPU/architecture mismatch errors.

### Using PowerShell:
```powershell
Compress-Archive -Path "d:\Office Automation\*" -DestinationPath "office-automation.zip" -Force
```

---

## 2. Transfer to Ubuntu System

Transfer the archive (`office-automation.zip`) to the target Ubuntu system using `scp`, `sftp`, or a USB drive:
```bash
scp office-automation.zip username@your-ubuntu-ip:/home/username/
```

---

## 3. Run the Automated Installer

SSH into your Ubuntu machine, unzip the archive, and run the automated `install.sh` script:

```bash
# SSH into your machine
ssh username@your-ubuntu-ip

# Install unzip if not present
sudo apt update && sudo apt install unzip -y

# Extract the package
unzip office-automation.zip -d office-automation
cd office-automation/deploy

# Make the installation script executable
chmod +x install.sh

# Run the automated installer
sudo ./install.sh
```

---

## 4. What the Installer Automates:
1. **Installs System Packages:** Installs Node.js v20, npm, LibreOffice (for Word-to-PDF generation), and PostgreSQL client utilities.
2. **Natively Installs npm Modules:** Installs all production dependencies (`npm install --production`) natively on your Ubuntu processor architecture.
3. **Database Upgrades:** Automatically runs [db_upgrade_ubuntu.sql](file:///d:/Office%20Automation/deploy/db_upgrade_ubuntu.sql) to add new tables/columns (such as GPF details, ward entitlement rules, settings) to your existing `office_automation` database.
4. **Initializes Secondary DB:** Creates the repository database `repo_db` and loads its vector schemas ([repo_setup_ubuntu.sql](file:///d:/Office%20Automation/deploy/repo_setup_ubuntu.sql)).
5. **Registers Background Services:** Creates a systemd service file at `/etc/systemd/system/office-automation.service` so that the server starts automatically on boot and auto-restarts on crashes.

---

## 5. Managing the Service on Ubuntu

Once installed, use standard systemd commands to control the backend:

* **Check Service Status:**
  ```bash
  sudo systemctl status office-automation.service
  ```
* **View Live Console Logs:**
  ```bash
  sudo journalctl -u office-automation.service -f
  ```
* **Restart the Server:**
  ```bash
  sudo systemctl restart office-automation.service
  ```
* **Stop the Server:**
  ```bash
  sudo systemctl stop office-automation.service
  ```
