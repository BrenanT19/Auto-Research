Source: https://vpic.nhtsa.dot.gov/Downloads/FAQ
Title: Frequently Asked Questions
Fetched: 2026-10-01T21:34:28.966Z

[Skip to content](https://vpic.nhtsa.dot.gov/Downloads/FAQ#content)

## Frequently Asked Questions

### SQL Server Backup Restoration

- To restore the SQL Server version of vpiclist\_lite on Windows, use SQL Server Management Studio to connect to your desired database server. Right-click on the "Databases" folder and select "Restore Database".
Under "Device", click the ellipsis icon on the right-hand side to open the next dialog. On the backup devices dialog, click "Add" to open the file window. Select the backup file and click "Ok".
On the main backup dialog, click "OK" to perform the restoration.

- When restoring using a TSQL script, the following command is recommended:



RESTORE DATABASE \[vPICList\_Lite\]


FROM DISK = N'{path-to-downloaded-bak-file}' WITH FILE = 1,


MOVE N'vPICList\_Lite' TO N'{path-to-MSSQL\\DATA-folder}\\vPICList\_Lite.mdf',


MOVE N'vPICList\_Lite\_log' TO N'{path-to-MSSQL\\DATA-folder}\\vPICList\_Lite\_log.ldf'


### PostgreSQL Backup Restoration

- To restore the PostgreSQL version of vpiclist\_lite, either a Database Management tool like pgAdmin can be used, or the Windows pg\_restore and psql commands. An existing database is required to restore the backup into, after which a new schema named "vpic" will be created:
  - To restore the PostgreSQL version of vpiclist\_lite on Windows using pgAdmin, connect to the desired database server and create an empty database. Right-click the database and select "Restore".
     On the "General" tab, select "Custom or tar" with the Custom backup, and "Plain" for the plain backup. For the custom restore, under "Data Options", in the "Do not save" section, ensure "Owner" and "Privileges" are selected.
     Select the backup file, and click "Restore".
- When restoring using pg\_restore or psql, the following command structures are recommended:
  - **Custom:**
     pg\_restore.exe --host {your\_host} --port {your\_port} --username {your\_username} --dbname {your\_db} --no-password --no-owner --no-privileges --verbose {path\_to\_file}

  - **Plain:**
     psql.exe --host {your\_host} --port {your\_port} --username {your\_username} --dbname {your\_db} --file {path\_to\_file}

### Parameters for spVinDecode procedure/functions

| position | name | data type | required | description |
| --- | --- | --- | --- | --- |
| 1 | V | varchar(17) | yes | VIN - Vehicle information number to be decoded, up to 17 characters |
| 2 | IncludePrivate | bit | no | If 1/true, then NCSA specific variables will be included in the output |
| 3 | Year | int | no | ModelYear for the vehicle, if omitted, it will be calculated from the VIN |
| 4 | IncludeAll | bit | no | If 1/true, then ALL variables will be included in the output, even if they don't have any value |
| 5 | NoOutput | bit | no | If 1/true, then output will be redirected to the table 'DecodingOutput' |

### Parameters for spVinDecodeMultiple procedure/function

| position | name | data type | required | description |
| --- | --- | --- | --- | --- |
| 1 | vin\_list / @VinList | varchar(17)\[\] (PostgreSQL) / tblVinList (SQL Server) | yes | List or array of VINs to decode in batch. **Maximum limit of 100 VINs per execution.** |