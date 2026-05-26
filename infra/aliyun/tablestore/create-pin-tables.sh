#!/bin/sh
set -eu

CLI="/Users/chengrundong/.local/bin/aliyun"
INSTANCE="pin-main"
REGION="cn-hangzhou"
ENDPOINT="https://${INSTANCE}.${REGION}.ots.aliyuncs.com"
ACCESS_KEY_ID="${ALIYUN_ACCESS_KEY_ID:-}"
ACCESS_KEY_SECRET="${ALIYUN_ACCESS_KEY_SECRET:-}"

if [ -z "${ACCESS_KEY_ID}" ] || [ -z "${ACCESS_KEY_SECRET}" ]; then
  echo "ALIYUN_ACCESS_KEY_ID and ALIYUN_ACCESS_KEY_SECRET are required"
  exit 1
fi

run_ots() {
  "${CLI}" otsutil "$@"
}

create_table() {
  table_name="$1"
  pk_json="$2"
  echo "Creating table: ${table_name}"
  run_ots create -t "${table_name}" --pk "${pk_json}" --ttl -1 --version 1 || true
}

echo "Configuring otsutil for instance: ${INSTANCE}"
run_ots config \
  --endpoint "${ENDPOINT}" \
  --instance "${INSTANCE}" \
  --id "${ACCESS_KEY_ID}" \
  --key "${ACCESS_KEY_SECRET}" \
  --region "${REGION}"

create_table "pin_users" '[{"c":"uid","t":"string"}]'
create_table "pin_projects" '[{"c":"projectId","t":"string"}]'
create_table "pin_folders" '[{"c":"folderId","t":"string"}]'
create_table "pin_artworks" '[{"c":"artworkId","t":"string"}]'
create_table "pin_points_records" '[{"c":"uid","t":"string"},{"c":"recordId","t":"string"}]'
create_table "pin_recent_imports" '[{"c":"uid","t":"string"},{"c":"projectId","t":"string"}]'
create_table "pin_relations" '[{"c":"uid","t":"string"},{"c":"relationKey","t":"string"}]'
create_table "pin_settings" '[{"c":"uid","t":"string"}]'

echo "Tablestore table initialization finished."
