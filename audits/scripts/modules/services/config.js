export const SERVICE_PATTERNS = [
  { regex: /docker|containerd/i, icon: '🐳', category: 'Conteneurs' },
  { regex: /ssh/i, icon: '🔐', category: 'Sécurité' },
  { regex: /cron/i, icon: '⏱️', category: 'Système' },
  { regex: /dbus/i, icon: '🔌', category: 'Système' },
  { regex: /ntp|ntpsec|timesync/i, icon: '🕒', category: 'Réseau' },
  { regex: /rpcbind/i, icon: '🧭', category: 'Réseau' },
  { regex: /rpc|nfs/i, icon: '📡', category: 'Réseau' },
  { regex: /smb|smbd|nmbd|cifs/i, icon: '🗂️', category: 'Stockage/Partages' },
  {
    regex: /systemd-(journald|logind|networkd|resolved|udevd)/i,
    icon: '⚙️',
    category: 'Système',
  },
  { regex: /rsyslog/i, icon: '📝', category: 'Journalisation' },
  { regex: /bluetooth/i, icon: '📶', category: 'Réseau' },
  { regex: /unattended-upgrades/i, icon: '🔄', category: 'Mises à jour' },
  { regex: /thermald/i, icon: '🌡️', category: 'Système' },
];
