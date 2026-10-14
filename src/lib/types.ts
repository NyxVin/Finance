export interface Profile { id: string; full_name: string | null; base_currency: string; timezone: string; emergency_months: number }
export interface Account { id: string; name: string; type: string; currency: string; opening_balance: number; rate_to_base: number; is_liquid: boolean; is_emergency_fund: boolean; is_archived: boolean }
export interface Category { id: string; name: string; type: 'income' | 'expense'; is_essential: boolean }
export type TxType = 'income' | 'expense' | 'transfer' | 'debt_payment' | 'adjustment'
export interface Tx { id: string; type: TxType; date: string; amount: number; currency: string; exchange_rate: number; amount_base: number; account_id: string; to_account_id: string | null; to_amount: number | null; category_id: string | null; liability_id: string | null; description: string | null }
export interface Budget { id: string; category_id: string; month: string; amount_limit: number }
export interface Asset { id: string; name: string; type: string; value: number; currency: string; rate_to_base: number; value_updated_at: string }
export interface Liability { id: string; name: string; principal: number; currency: string; rate_to_base: number; due_date: string | null; value_updated_at: string }
export interface Goal { id: string; name: string; type: string; target_amount: number; deadline: string | null }
export interface Contribution { id: string; goal_id: string; date: string; amount: number; note: string | null }
export interface Project { id: string; name: string; description: string | null; deadline: string | null; status: 'active' | 'done' | 'archived' }
export interface Task { id: string; title: string; description: string | null; status: 'todo' | 'in_progress' | 'done'; priority: 'low' | 'medium' | 'high'; start_date: string | null; due_date: string | null; project_id: string | null; completed_at: string | null }
export interface Habit { id: string; name: string; frequency_type: 'daily' | 'days' | 'weekly_count'; target_per_week: number | null; target_days: number[] | null; is_archived: boolean }
export interface HabitLog { id: string; habit_id: string; log_date: string }
export interface Store { accounts: Account[]; categories: Category[]; transactions: Tx[]; budgets: Budget[]; assets: Asset[]; liabilities: Liability[]; goals: Goal[]; contributions: Contribution[]; projects: Project[]; tasks: Task[]; habits: Habit[]; habitLogs: HabitLog[] }
export type Key = keyof Store
