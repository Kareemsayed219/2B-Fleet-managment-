-- current_date in RLS policies (e.g. "vehicle assigned to me today") should follow Egypt time, not UTC.
alter database postgres set timezone to 'Africa/Cairo';
