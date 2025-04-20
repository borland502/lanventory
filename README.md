# Lanventory

## Overview

Lanventory is intended to dump artifacts like ssh config, hosts, and other files based on a running nmap scan of an ip range. While set up as a web app for learning purposes this project is never intended to be exposed to the internet or used outside a private home-lab setting.

## Prerequisites

1. nmap -- needs to be available to root due to the type of scan used

## Commands

### NMAP

```bash
# Scan a specific IP range (default ports: 22, 2222)
lanventory nmap 192.168.1.0/24

# Scan a specific IP range with custom ports
lanventory nmap 192.168.1.0/24 -p 22,80,443

# Scan a specific IP range with all ports (1-65535)
lanventory nmap 192.168.1.0/24 --all-ports
```

This command scans the specified IP range for hosts with open ports and stores the information in the database. The system only records ports that are found to be open during the scan.

By default, it scans ports 22 and 2222. You can specify custom ports using the `-p` option with a comma-separated list of port numbers.

The `--all-ports` option performs a thorough scan of all ports (1-65535), which is useful for discovering all open services on the network but takes significantly longer to complete. This option is particularly valuable for comprehensive network auditing and security assessments.

### DUMP

#### Hosts

```bash
# Dump hosts to /etc/hosts
sudo lanventory dump hosts
```

This command dumps host information from the database to the /etc/hosts file.

#### Ports

```bash
# Generate a table of open ports by host
lanventory dump ports

# Specify a custom output file
lanventory dump ports -o /path/to/output.md
```

This command generates a markdown table that associates open ports with descriptions, using the primary host key. The table includes:

- Host information (name, IP, hostname)
- Port number
- Protocol
- Service name
- Description

The output is a markdown file that can be viewed in any markdown viewer.
