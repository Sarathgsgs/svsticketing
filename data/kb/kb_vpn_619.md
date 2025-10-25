# VPN Error 619 (Connection Failed)

Symptoms:
- VPN disconnects with error 619.
- Field office users.

Fix steps:
1. Reset network adapter (netsh int ip reset).
2. Reset Winsock (netsh winsock reset).
3. Flush DNS (ipconfig /flushdns).
4. Restart VPN client service.
