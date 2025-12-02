
import React, { useState } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, PieChart, Receipt } from 'lucide-react';

interface Expense {
  id: string;
  name: string;
  amount: number;
  category: 'accommodation' | 'food' | 'transport' | 'activities' | 'shopping' | 'other';
  date: string;
  currency: string;
  notes?: string;
  receipt?: string;
}

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  currency: string;
}

interface BudgetTrackerProps {
  tripId: string;
  totalBudget: number;
  expenses: Expense[];
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
}

export const BudgetTracker = ({ tripId: _tripId, totalBudget, expenses, onAddExpense: _onAddExpense }: BudgetTrackerProps) => {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: BudgetCategory[] = [
    { category: 'accommodation', budgeted: totalBudget * 0.4, spent: 0, currency: 'USD' },
    { category: 'food', budgeted: totalBudget * 0.3, spent: 0, currency: 'USD' },
    { category: 'transport', budgeted: totalBudget * 0.15, spent: 0, currency: 'USD' },
    { category: 'activities', budgeted: totalBudget * 0.1, spent: 0, currency: 'USD' },
    { category: 'shopping', budgeted: totalBudget * 0.03, spent: 0, currency: 'USD' },
    { category: 'other', budgeted: totalBudget * 0.02, spent: 0, currency: 'USD' },
  ];

  // Calculate actual spending per category
  categories.forEach(cat => {
    cat.spent = expenses
      .filter(exp => exp.category === cat.category)
      .reduce((sum, exp) => sum + exp.amount, 0);
  });

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remainingBudget = totalBudget - totalSpent;
  const spentPercentage = (totalSpent / totalBudget) * 100;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'accommodation': return '🏨';
      case 'food': return '🍽️';
      case 'transport': return '🚗';
      case 'activities': return '🎪';
      case 'shopping': return '🛍️';
      case 'other': return '📦';
      default: return '💰';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'accommodation': return 'bg-blue-500';
      case 'food': return 'bg-green-500';
      case 'transport': return 'bg-yellow-500';
      case 'activities': return 'bg-purple-500';
      case 'shopping': return 'bg-pink-500';
      case 'other': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredExpenses = selectedCategory === 'all' 
    ? expenses 
    : expenses.filter(exp => exp.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Budget Overview</h3>
          <button
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>

        {/* Budget Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-300">Total Spent</span>
            <span className="text-white font-semibold">${totalSpent.toFixed(2)} / ${totalBudget.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                spentPercentage > 90 ? 'bg-red-500' : 
                spentPercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm">
            <span className={`${remainingBudget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {remainingBudget >= 0 ? (
                <div className="flex items-center gap-1">
                  <TrendingUp size={16} />
                  ${remainingBudget.toFixed(2)} remaining
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <TrendingDown size={16} />
                  ${Math.abs(remainingBudget).toFixed(2)} over budget
                </div>
              )}
            </span>
            <span className="text-gray-400">{spentPercentage.toFixed(1)}% used</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const percentage = cat.budgeted > 0 ? (cat.spent / cat.budgeted) * 100 : 0;
            return (
              <div key={cat.category} className="bg-gray-800/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategoryIcon(cat.category)}</span>
                    <span className="text-white font-medium capitalize">{cat.category}</span>
                  </div>
                  <PieChart size={16} className="text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Spent</span>
                    <span className="text-white">${cat.spent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Budget</span>
                    <span className="text-gray-300">${cat.budgeted.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${getCategoryColor(cat.category)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    {percentage.toFixed(1)}% used
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-yellow-500 text-black'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          All Expenses
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setSelectedCategory(cat.category)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all capitalize ${
              selectedCategory === cat.category
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {getCategoryIcon(cat.category)} {cat.category}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-3xl p-6">
        <h4 className="text-xl font-bold text-white mb-4">Recent Expenses</h4>
        <div className="space-y-3">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="bg-gray-800/50 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getCategoryIcon(expense.category)}</span>
                    <div>
                      <h5 className="font-semibold text-white">{expense.name}</h5>
                      <p className="text-sm text-gray-400 capitalize">{expense.category} • {expense.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">${expense.amount.toFixed(2)}</div>
                    {expense.receipt && (
                      <Receipt size={16} className="text-gray-400 ml-auto mt-1" />
                    )}
                  </div>
                </div>
                {expense.notes && (
                  <p className="text-sm text-gray-300 mt-2 ml-12">{expense.notes}</p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <DollarSign size={48} className="mx-auto mb-3 opacity-50" />
              <p>No expenses recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
