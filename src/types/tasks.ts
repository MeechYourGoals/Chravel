export interface TripTask {
  id: string;
  trip_id: string;
  creator_id: string;
  title: string;
  description?: string;
  due_at?: string;
  is_poll: boolean;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
  task_status?: TaskStatus[];
}

export interface TaskStatus {
  task_id: string;
  user_id: string;
  completed: boolean;
  completed_at?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_at?: string;
  is_poll: boolean;
  assignedTo?: string[];
}

export interface ToggleTaskRequest {
  taskId: string;
  completed: boolean;
}
