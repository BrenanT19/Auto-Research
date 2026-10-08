-- Attach the existing unique index without dropping the key used by the
-- composite foreign key. This preserves data and the foreign-key dependency.
ALTER TABLE "spec_field_definitions"
  ADD CONSTRAINT "spec_field_definitions_code_type_idx"
  UNIQUE USING INDEX "spec_field_definitions_code_type_idx";