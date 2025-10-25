# SAP Spool Error SP01 (Output Issues)

Symptoms:
- SP01 shows spool request in error.
- Users in North region cannot print.

Fix steps:
1. In SPAD, verify output device status is GREEN.
2. Restart Spool Work Process via SM50.
3. Clear temporary SPO* files on the app server (admin).
