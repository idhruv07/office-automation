#!/usr/bin/env bash
# ============================================================
# UBUNTU 24.04 LTS AUTOMATION SETUP & PACKAGING SCRIPT
# Installs system dependencies, configures PostgreSQL databases,
# installs node modules, and registers systemd background services.
# Run with: sudo ./install.sh
# ============================================================

set -e

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this installation script as root (using sudo)."
  exit 1
fi

echo "============================================================"
echo "Starting Office Automation Setup on Ubuntu 24.04 LTS..."
echo "============================================================"

# 1. Update system packages
echo "[1/6] Updating apt packages..."
apt-get update -y

# 2. Install Node.js v20 if not already present
if ! command -v node &> /dev/null; then
  echo "Installing Node.js v20..."
  apt-get install -y curl
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "Node.js is already installed ($(node -v))."
fi

# 3. Install LibreOffice (for docx conversion) & Postgres client
echo "[2/6] Installing system dependencies (LibreOffice & PostgreSQL client)..."
apt-get install -y libreoffice postgresql-client build-essential

# 4. Copy project files and install dependencies
# Dynamically determine the directory of this script to find the correct project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

INSTALL_DIR="/opt/office-automation"
BACKUP_DIR="/opt/office-automation_backup_$(date +%Y%m%d_%H%M%S)"

# Load existing environment configuration if it exists to get DB credentials for pre-backup
if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
elif [ -f "$INSTALL_DIR/.env" ]; then
  source "$INSTALL_DIR/.env"
fi

DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_NAME=${DB_NAME:-office_automation}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_PORT=${DB_PORT:-5432}

# Backup DB before upgrading
echo "Backing up database '$DB_NAME' before running migrations..."
export PGPASSWORD=$DB_PASSWORD
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$SCRIPT_DIR/office_automation_pre_upgrade.sql" || echo "Warning: Database backup skipped or failed."

# Stop old background system services and free up port processes
echo "Stopping old systemd service if running..."
systemctl stop office-automation.service || true

echo "Ensuring ports 3000 and 3001 are free..."
if command -v fuser &> /dev/null; then
  fuser -k 3000/tcp || true
  fuser -k 3001/tcp || true
fi

# Backup old application files
if [ -d "$INSTALL_DIR" ]; then
  echo "Backing up old installation folder to $BACKUP_DIR..."
  mv "$INSTALL_DIR" "$BACKUP_DIR"
fi

echo "[3/6] Setting up project folder in $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

# Copy all directories/files from the resolved project root
cp -r "$PROJECT_ROOT"/* "$INSTALL_DIR/" || true
rm -rf "$INSTALL_DIR/node_modules"

# Restore user uploaded files from backup
if [ -d "$BACKUP_DIR/server/storage" ]; then
  echo "Restoring user uploaded storage files from backup..."
  mkdir -p "$INSTALL_DIR/server/storage"
  cp -r "$BACKUP_DIR/server/storage"/* "$INSTALL_DIR/server/storage/" || true
fi

cd "$INSTALL_DIR"

echo "Installing npm dependencies in production mode..."
npm install --production

# 5. Database Setup Configuration
echo "[4/6] Configuring databases..."

# Load local configurations
if [ ! -f .env ]; then
  echo "Creating default .env config..."
  cat <<EOT > .env
PORT=3001
DB_USER=postgres
DB_HOST=127.0.0.1
DB_NAME=office_automation
DB_PASSWORD=postgres
DB_PORT=5432
JWT_SECRET=super_secret_jwt_key
OLLAMA_BASE_URL=http://localhost:11434
EOT
fi

# Read configurations
source .env

export PGPASSWORD=$DB_PASSWORD

echo "Running migrations on existing '$DB_NAME' database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f deploy/db_upgrade_ubuntu.sql

echo "Creating secondary repository database 'repo_db' if it doesn't exist..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE repo_db;" || echo "repo_db already exists or could not be created directly."

echo "Running migrations on 'repo_db'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d repo_db -f deploy/repo_setup_ubuntu.sql

# 6. Install Systemd background service
echo "[5/6] Creating Systemd service for backend..."

SERVICE_FILE="/etc/systemd/system/office-automation.service"
cat <<EOT > "$SERVICE_FILE"
[Unit]
Description=Office Automation Express Backend Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm run server
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOT

echo "Reloading systemd and enabling service..."
systemctl daemon-reload
systemctl enable office-automation.service
systemctl restart office-automation.service

echo "[6/6] Office Automation service is running on http://localhost:$PORT!"
echo "============================================================"
echo "Deployment Complete!"
echo "To check service status: sudo systemctl status office-automation.service"
echo "To view logs: sudo journalctl -u office-automation.service -f"
echo "============================================================"
