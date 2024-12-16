# Databaes - Enterprise Solution for Secure Document Management System
> Trust Blockchain, Not Server

## 🏗️ Architecture
![Databaes Icraft 3 (3)](https://github.com/user-attachments/assets/abe56f00-1b54-4d14-971e-609c2cfeeabe)

Databaes is a revolutionary document management system that combines blockchain security, decentralized storage, and advanced cryptography to provide secure, transparent, and controlled document sharing across organizations.

## 🚀 Features

- **Permissioned Blockchain**: Using **Hyperledger Fabric** an **enterprise-grade permissioned distributed ledger** framework for developing solutions.
- **Decentralized File Storage**: Uses **IPFS** for storing file contents off-chain and retrieving them via blockchain references.
- **Advanced Key Management**: Shamir Secret Sharing for distributed key control.
- **End-to-end encryption**: File and encrypted during transmission, only authorized user can get the key share to decrypt the files.
- **Transparency**: Immutable audit trails for all actions.


## 🛠️ Technology Stack

- **Blockchain**: Hyperledger Fabric
- **Storage**: IPFS (InterPlanetary File System)
- **Key Management System**: Shamir Secret Sharing (SSS)
- **Backend**: JavaScript, Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Database**: LowDB
- **Containerization**: Kubo, Docker
- **API**: RESTful API

## 📋 Prerequisites

- Node.js >= 18.x
- Docker >= 20.10
- Docker Compose >= 2.0
- IPFS Daemon
- Hyperledger Fabric 2.x

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/jquan18/Databaes.git databaes
cd databaes
```

2. Install dependencies:
```bash
# Install latest Hyperledger Fabric binaries
$ curl -sSL https://bit.ly/2ysbOFE | bash -s

# Install NVM
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Install frontend dependencies
cd frontend
npm install

# Install IPFS
cd ../ipfs
npm install

# Install SSS
cd ../secret-sharing
npm install

# Install backend dependencies
cd ../server
npm install
```

3. Edit env file:
```bash
cd ..
cp .env.example .env
vim .env
```

4. Start the Hyperledger Fabric network:
```bash
./blockchain/test-network/up.sh
```
	Expected Output:
	
 ![Screenshot 2024-12-16 222833](https://github.com/user-attachments/assets/834904d5-28cc-4c66-80c1-9ed3d372178f)



1. Start IPFS daemon:
```bash
ipfs init
ipfs daemon
```

6. Run the server
```bash
# Start backend services
cd server
node scripts/enrollAdmin.cjs 
```
	Expected Output:
	
 ![Screenshot 2024-12-16 222904](https://github.com/user-attachments/assets/dc5519d2-cd21-4186-9f44-dc8e237dbd46)


```
node app.js
```

## 🌟 Use Cases

### Healthcare
- Secure sharing of patient records
- HIPAA compliance support
- Controlled access for healthcare providers

### Government
- Classified document management
- Inter-department file sharing
- Audit trail for compliance

### Financial Services
- Secure client data management
- Investment document protection
- Regulatory compliance support

### Enterprise
- Cross-organization collaboration
- Intellectual property protection
- Secure document workflows


## 👥 Team
- [Jun Quan](https://github.com/jquan18)
- [Colin Woon](https://github.com/colin-woon) 
- [Cody Liew](https://github.com/codyy6) 


---

Made with ❤️ by Databaes Team
