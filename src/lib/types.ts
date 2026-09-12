export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "master_admin" | "admin";
  is_active: boolean;
};
export type Project = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "archived";
};
export type Category = { id: string; project_id: string; name: string };
export type Transaction = {
  id: string;
  project_id: string;
  category_id: string;
  type: "income" | "expense";
  transaction_date: string;
  amount: string;
  description: string;
  proof_path: string | null;
  created_at: string;
  updated_at: string;
};
export type ShareLink = {
  id: string;
  project_id: string;
  token: string;
  is_active: boolean;
  show_proof: boolean;
  created_at: string;
};
export type Assignment = { project_id: string; admin_id: string };
export type Workspace = {
  profile: Profile;
  projects: Project[];
  categories: Category[];
  transactions: Transaction[];
  links: ShareLink[];
  profiles: Profile[];
  assignments: Assignment[];
};
export type ActionResult = { ok: boolean; message: string };
