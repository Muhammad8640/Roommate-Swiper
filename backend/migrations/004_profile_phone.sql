-- Existing profiles keep NULL until their owner supplies a phone number.
ALTER TABLE roommate.profiles ADD COLUMN phone text
  CHECK (phone IS NULL OR (
    phone = btrim(phone)
    AND length(phone) <= 25
    AND phone ~ '^\+?[0-9(). -]+$'
    AND length(regexp_replace(phone, '[^0-9]', '', 'g')) BETWEEN 10 AND 15
  ));
