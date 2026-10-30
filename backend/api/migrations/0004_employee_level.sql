ALTER TABLE employees
ADD COLUMN level TEXT NOT NULL DEFAULT 'E1'
CHECK (level IN ('E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12'));
