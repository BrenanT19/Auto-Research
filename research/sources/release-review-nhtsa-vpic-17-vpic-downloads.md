Source: https://vpic.nhtsa.dot.gov/Downloads
Title: 
Fetched: 2026-10-08T02:37:19.724Z

[Skip to content](https://vpic.nhtsa.dot.gov/Downloads#content)

## Standalone Databases

Standalone vPIC Databases are intended for use by developers and researchers who prefer to use a local database instead of calling the vPIC API.
There are quotas and rate limits associated with the usage of the vPIC API, and you can avoid reaching the limits by using the standalone databases.
Please be aware that standalone databases are limited to _VIN Decoding_ functionality only.
To retrieve other information (such as makes, models, variables, attributes, etc.), you will still need to use vPIC APIs.

### MS SQL Server

SQL Server backup file is compatible with MS SQL Server 2019 and newer versions.

[Download](https://vpic.nhtsa.dot.gov/downloads/vPICList_lite_2026_09.bak.zip) MS SQL Server backup file "vPICList\_lite\_2026\_09.bak.zip" updated on 09/19/2026, file size: 178 MB

Once downloaded, you can restore it. Here’s an example using the command below:

```
RESTORE DATABASE [vPICList_Lite]
FROM  DISK = N'{path-to-downloaded-bak-file}' WITH  FILE = 1,
MOVE N'vPICList_Lite' TO N'{path-to-MSSQL\DATA-folder}\vPICList_Lite.mdf',
MOVE N'vPICList_Lite_log' TO N'{path-to-MSSQL\DATA-folder}\vPICList_Lite_log.ldf'
```

Once restored, you can decode a VIN by calling the 'spVinDecode' stored procedure like this:

```
EXEC dbo.spVinDecode 'ABC12345XYZ123456'
```

To decode multiple VINs in batch, pass them via the `tblVinList` table-valued parameter:

```
DECLARE @VinList dbo.tblVinList;
INSERT INTO @VinList (Vin) VALUES ('ABC12345XYZ123456'), ('654321ZYX54321CBA');
EXEC dbo.spVinDecodeMultiple @VinList;
```

See the [FAQs](https://vpic.nhtsa.dot.gov/Downloads/FAQ) page for details about specific parameters.

### PostgreSQL

PostgreSQL backup files are compatible with PostgreSQL version 17 and newer. The PostgreSQL database is provided in two formats: custom and plain.
The custom format is a compressed binary file containing the database. The plain format is a plain-text SQL file containing scripts to create the database.
Both formats will restore the database into a separate schema named 'vpic'.


[Download](https://vpic.nhtsa.dot.gov/downloads/vPICList_lite_2026_09.custom.zip) PostgreSQL custom backup file "vPICList\_lite\_2026\_09.custom.zip" updated on 09/19/2026, file size: 67.8 MB

[Download](https://vpic.nhtsa.dot.gov/downloads/vPICList_lite_2026_09.plain.zip) PostgreSQL plain backup file "vPICList\_lite\_2026\_09.plain.zip" updated on 09/19/2026, file size: 72.6 MB

All ownership and privilege information has been excluded. However, to ensure no errors are encountered during the restore process,
it is recommended to restore the backup with the `--no-owner` and `--no-privileges` options, as shown in the examples below. Additionally,
ensure that the account used for the restoration has login access to the target database.


Once downloaded, you can restore the database like this using the Windows command line while inside a PostgreSQL installation directory:

Custom:

```
pg_restore.exe --host {your_host} --port {your_port} --username {your_username} --dbname {your_db} --no-password --no-owner --no-privileges --verbose {path-to-downloaded-custom-file}
```

Plain:

```
psql.exe --host {your_host} --port {your_port} --username {your_username} --dbname {your_db} --file {path-to-downloaded-plain-file}
```

To decode a single VIN, call the `spVinDecode` function:

```
SELECT * FROM vpic.spVinDecode('ABC12345XYZ123456');
```

To decode multiple VINs in batch, pass the array directly into `spVinDecodeMultiple`:

```
SELECT * FROM vpic.spVinDecodeMultiple(ARRAY['ABC12345XYZ123456', '654321ZYX54321CBA']);
```

See the [FAQs](https://vpic.nhtsa.dot.gov/Downloads/FAQ) page for details about specific parameters.