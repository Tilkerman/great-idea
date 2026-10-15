-- Guest Web Push (no account). Reminders were a JSON file on Yandex Object Storage.

alter table push_devices
  alter column subscription drop not null;

alter table push_devices
  add column if not exists reminders jsonb not null default '[]'::jsonb;
