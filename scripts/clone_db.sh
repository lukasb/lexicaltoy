#!/bin/bash

#### THIS SCRIPT IS A NICE IDEA BUT IT'S BROKEN AND WILL PROBABLY CORRUPT THE DEVELOPMENT DB
# TODO dumps the prod db fine but has an error connecting to the development db
# TODO also need to change now that all the variables in the .env.production.local and .env.development.local have the same names

#
# Clone production database into development database
# WARNING: This script will DROP the development database and recreate it!
# Overwrites any existing contents in development database
#

echo "this script is broken and will probably corrupt the development database. exiting."
exit 1;

# modify this to wherever postgres is installed
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

source ../.env.production.local
source ../.env.development.local

echo "WARNING: This will DROP the existing development database and recreate it, overwriting all contents. Are you sure? (type 'yes' to proceed)"
read confirmation
if [ "$confirmation" != "yes" ]; then
  echo "Exiting. Database not cloned."
  exit 1
fi

# Dump production database
pg_dump $POSTGRES_URL > production_dump.sql

# Prepare for dropping and recreating the development database
export PGPASSWORD=$POSTGRES_DEV_PASSWORD

# Drop the development database if it exists
echo "Dropping existing development database..."
psql -h $POSTGRES_DEV_HOST -U $POSTGRES_DEV_USER -c "DROP DATABASE IF EXISTS $POSTGRES_DEV_DATABASE;"

# Recreate the development database
echo "Creating new development database..."
psql -h $POSTGRES_DEV_HOST -U $POSTGRES_DEV_USER -c "CREATE DATABASE $POSTGRES_DEV_DATABASE;"

# Restore the dump into the newly created development database
psql -h $POSTGRES_DEV_HOST -U $POSTGRES_DEV_USER -d $POSTGRES_DEV_DATABASE < production_dump.sql

# Cleanup
unset PGPASSWORD

echo "Cloning complete!"