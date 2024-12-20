// Contract File Asset 1
'use strict';

const { Contract } = require('fabric-contract-api');

class fileAssetContract extends Contract {

    // CreateFileAsset
    async CreateFileAsset(ctx, fileId, fileName, mimeType, ipfsPath, sharedKey, ownerID, accessUserList, dt) {
        const fileAsset = {
            ID: fileId,
            FileName: fileName,
            MimeType: mimeType,
            IpfsPath: ipfsPath,
            SharedKey: sharedKey,
            OwnerID: ownerID,
            Version: 1,
            AccessUserList: accessUserList,
            CreateDateTime: dt,
            LastUpdated: dt,
            UpdatedBy: ownerID
        };
        await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)));
        return JSON.stringify(fileAsset);
    }

    // ReadFileAsset
    async ReadFileAsset(ctx, fileId) {
        let assetJSON = await ctx.stub.getState(fileId);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${fileId} does not exist`);
        }

        try{
            assetJSON = assetJSON.toString();
            return assetJSON;
        } catch (err) {
            throw(err);
        }
    }

    // UpdateFileAsset
    async UpdateFileAsset(ctx, userID, fileId, fileName, mimeType, ipfsPath, sharedKey, dt) {
        try {
            const assetString = await this.ReadFileAsset(ctx, fileId);
    
            let fileAsset;
            try {
                fileAsset = JSON.parse(assetString);
                let accessUserList = JSON.parse(fileAsset.AccessUserList);
    
                // Check if user who updates the asset has a permission to update (in granted access)
                if (!accessUserList.hasOwnProperty(userID)) {
                    throw new Error(` userID = ${userID} has no permission to update`);
                }
    
                // Update Field
                fileAsset.FileName = fileName;
                fileAsset.MimeType = mimeType;
                fileAsset.IpfsPath = ipfsPath;
                fileAsset.SharedKey = sharedKey;
                fileAsset.Version += 1;
                fileAsset.LastUpdated = dt;
                fileAsset.UpdatedBy = userID;
            } catch (err) {
                throw new Error(`id = ${fileId} data can't be processed\n ${err}`);
            }
    
            await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)));
            return JSON.stringify(fileAsset);
        } catch (err) {
            throw(err);
        }
    }

    // UpdateFileAccessAsset for grant or revoke file access 
    async UpdateFileAccessAsset(ctx, userID, fileId, sharedKey, accessUserList, dt) {
        try {
            const assetString = await this.ReadFileAsset(ctx, fileId);

            let fileAsset;
            try {
                fileAsset = JSON.parse(assetString);
                let userList = JSON.parse(fileAsset.AccessUserList);
    
                // Check if user who update access user list of the asset has a permission to share (in granted access)
                if (!userList.hasOwnProperty(userID)) {
                    throw new Error(` userID = ${userID} has no permission to share access`);
                }

                // Update Field
                fileAsset.SharedKey = sharedKey;
                fileAsset.AccessUserList = accessUserList;
                fileAsset.Version += 1;
                fileAsset.LastUpdated = dt;
                fileAsset.UpdatedBy = userID;
            } catch (err) {
                throw new Error(`id = ${fileId} data can't be processed`);
            }

            await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)));
            return JSON.stringify(fileAsset);
        } catch (err) {
            throw (err);
        }
    }

    // DeleteFileAsset
    async DeleteFileAsset(ctx, userID, fileId) {
        try{
            const assetString = await this.ReadFileAsset(ctx, fileId);
            let fileAsset;
            try {
                fileAsset = JSON.parse(assetString);

                // Check if user who delete the asset is the owner
                if (fileAsset.OwnerID != userID) {
                    throw new Error(` userID = ${userID} has no permission to delete`);
                }
                
            } catch (err) {
                throw new Error(`id = ${fileId} data can't be processed`);
            }
            return await ctx.stub.deleteState(fileId);
        } catch (err) {
            throw new Error(`The asset ${fileId} does not exist`);
        }
    }

    // TransferFileAsset
    async TransferFileAsset(ctx, userID, fileId, newOwnerID, dt) {
        try{
            const assetString = await this.ReadFileAsset(ctx, fileId);

            let fileAsset;
            try {
                fileAsset = JSON.parse(assetString);

                // Check if user who transfers the asset is the owner
                if (fileAsset.OwnerID != userID) {
                    throw new Error(` userID = ${userID} has no permission to transfer`);
                }

                // Update Owner Field
                fileAsset.OwnerID = newOwnerID;
                fileAsset.LastUpdated = dt;
                fileAsset.UpdatedBy = userID;
            } catch (err) {
                throw new Error(`id = ${fileId} data can't be processed\n ${err}`);
            }

            await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)));
            return JSON.stringify(fileAsset);
        } catch (err) {
            throw (err)
        }
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllFileAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (Object.keys(record).length == 11){
                allResults.push({ Key: result.value.key, Record: record });
            }
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    // GetAssetHistory returns the chain of custody for an asset since issuance.
	async GetFileAssetHistory(ctx, fileID) {
        try {
            let resultsIterator = await ctx.stub.getHistoryForKey(fileID);
            let results = await this.GetAllResults(resultsIterator, true);
    
            return JSON.stringify(results);
        } catch (err) {
            throw (err);
        }
	}

    async GetAllResults(iterator, isHistory) {
		let allResults = [];
		let res = await iterator.next();
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) {
					jsonRes.TxId = res.value.tx_id;
					jsonRes.Timestamp = res.value.timestamp;
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else {
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}
}

module.exports = fileAssetContract;