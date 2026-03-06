-- Create database if not exists (this runs automatically in postgres image)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on completed status for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Insert some sample data for development
INSERT INTO tasks (title, description, completed, created_at) 
VALUES 
    ('Welcome to Task Manager', 'This is your first task!', false, NOW()),
    ('Complete Docker exercise', 'Finish Exercise 10 with multi-tier architecture', false, NOW()),
    ('Learn docker-compose', 'Master multi-container orchestration', true, NOW())
ON CONFLICT DO NOTHING;
