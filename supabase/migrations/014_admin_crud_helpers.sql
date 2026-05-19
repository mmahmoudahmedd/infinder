-- Atomic cascade delete for a learning module and all its lessons
CREATE OR REPLACE FUNCTION delete_module_cascade(p_module_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM lessons WHERE module_id = p_module_id;
  DELETE FROM learning_modules WHERE id = p_module_id;
END;
$$;
