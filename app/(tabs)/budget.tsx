import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const initialBudget = {
  income: [
    { name: "Salary", amount: "" },
    { name: "Other Income", amount: "" }
  ],
  essentials: [
    { name: "Rent", amount: "" },
    { name: "Utilities", amount: "" },
    { name: "Groceries", amount: "" }
  ],
  variable: [
    { name: "Eating Out", amount: "" },
    { name: "Entertainment", amount: "" }
  ],
  savings: [
    { name: "Savings Account", amount: "" },
    { name: "Investments", amount: "" }
  ]
};

export const tabBarOptions = {
  title: 'Budget',
};

export default function BudgetPlannerScreen() {
  const [budget, setBudget] = useState(initialBudget);

  const handleInput = (section, idx, value) => {
    setBudget(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === idx ? { ...item, amount: value } : item
      )
    }));
  };

  const totalIncome = budget.income.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalEssentials = budget.essentials.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalVariable = budget.variable.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalSavings = budget.savings.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalExpenses = totalEssentials + totalVariable + totalSavings;
  const balance = totalIncome - totalExpenses;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>This Month</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryLabel, { color: "#22c55e" }]}>Income</Text>
            <Text style={styles.summaryValue}>{totalIncome}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryLabel, { color: "#f97316" }]}>Expenses</Text>
            <Text style={styles.summaryValue}>{totalExpenses}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryLabel, { color: balance < 0 ? "#ef4444" : "#06b6d4" }]}>Balance</Text>
            <Text style={[
              styles.summaryValue,
              { color: balance < 0 ? "#ef4444" : "#06b6d4" }
            ]}>{balance}</Text>
          </View>
        </View>
      </View>

      <BudgetSectionCard
        title="Income"
        color="#22c55e"
        icon="cash-outline"
        items={budget.income}
        onInput={(idx, value) => handleInput('income', idx, value)}
      />

      <BudgetSectionCard
        title="Essential Expenses"
        color="#fbbf24"
        icon="home-outline"
        items={budget.essentials}
        onInput={(idx, value) => handleInput('essentials', idx, value)}
      />

      <BudgetSectionCard
        title="Variable Expenses"
        color="#3b82f6"
        icon="cart-outline"
        items={budget.variable}
        onInput={(idx, value) => handleInput('variable', idx, value)}
      />

      <BudgetSectionCard
        title="Investments & Savings"
        color="#a21caf"
        icon="trending-up-outline"
        items={budget.savings}
        onInput={(idx, value) => handleInput('savings', idx, value)}
      />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function BudgetSectionCard({ title, color, icon, items, onInput }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Ionicons name={icon} size={22} color={color} style={{ marginRight: 8 }} />
        <Text style={[styles.cardTitle, { color }]}>{title}</Text>
      </View>
      {items.map((item, idx) => (
        <View style={styles.inputRow} key={item.name}>
          <Text style={styles.cardLabel}>{item.name}</Text>
          <TextInput
            style={styles.cardInput}
            keyboardType="numeric"
            placeholder="0"
            value={item.amount}
            onChangeText={value => onInput(idx, value)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f3f4f6',
    flexGrow: 1
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 22,
    padding: 18,
    alignItems: 'center'
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    color: "#334155"
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  summaryBox: {
    alignItems: 'center',
    flex: 1
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderLeftWidth: 7,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 0
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  cardLabel: {
    flex: 1,
    fontSize: 16,
    color: "#334155"
  },
  cardInput: {
    width: 85,
    backgroundColor: '#f9fafb',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 7,
    fontSize: 16,
    textAlign: 'right'
  }
});
