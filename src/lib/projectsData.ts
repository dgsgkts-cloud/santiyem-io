import { FolderOpen, Clock, TrendingUp, AlertTriangle } from "lucide-react";

export interface Project {
  id: string;
  name: string;
  client: string;
  start: string;
  end: string;
  progress: number;
  status: string;
  statusColor: string;
  done: number;
  ongoing: number;
  failed: number;
  delayed: number;
  budget: string;
  location: string;
  manager: string;
  description: string;
  milestones: { title: string; date: string; completed: boolean }[];
  recentActivity: { text: string; time: string; color: string }[];
}

export const PROJECTS: Project[] = [];

export const getProjectById = (id: string) => PROJECTS.find(p => p.id === id);
