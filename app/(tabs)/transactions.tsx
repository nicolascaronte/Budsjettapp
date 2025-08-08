import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const CATEGORY_COLORS = {
  Income: '#22c55e',
  Essentials: '#fbbf24',
  Variable: '#3b82f6',
  Savings: '#a21caf',
  Other: '#64748b'
};

const ALL_CATEGORIES = ['Income', 'Essentials', 'Variable', 'Savings', 'Other'];

const initialTransactions = [
  { id: 1, date: '2024-08-07', description: 'Salary', category: 'Income', amount: 3500 },
  { id: 2, date: '2024-08-07', description: 'Groceries', category: 'Essentials', amount: -100 },
  { id: 3, date: '2024-08-06', description: 'Cinema', category: 'Variable', amount: -45 },
  { id: 4, date: '2024-08-05', description: 'Savings Account', category: 'Savings', amount: -400 }
];

export const tabBarOptions = {
  title: 'Transactions',
};

type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  category: string;
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [form, setForm] = useState({
    date: '',
    description: '',
    category: 'Essentials',
    amount: ''
  });

  const [image, setImage] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // This object remembers your category choices for descriptions
  const [categoryMemory, setCategoryMemory] = useState<{ [desc: string]: string }>({});

  const addTransaction = () => {
    if (!form.date || !form.description || !form.amount) return;
    setTransactions([
      { id: Date.now(), ...form, amount: Number(form.amount) },
      ...transactions
    ]);
    setCategoryMemory(mem => ({
      ...mem,
      [form.description.trim().toLowerCase()]: form.category
    }));
    setForm({ date: '', description: '', category: 'Essentials', amount: '' });
    Keyboard.dismiss();
  };

  // --- OCR + Parsing ---
  async function extractTextFromImage(imageUri: string): Promise<string> {
    const apiKey = 'helloworld'; // Free OCR.space API key
    const url = 'https://api.ocr.space/parse/image';

    // Fetch the image as blob
    const response = await fetch(imageUri);
    // @ts-ignore
    const blob = await response.blob();

    const formData = new FormData();
    // @ts-ignore
    formData.append('file', blob, 'screenshot.jpg');
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isTable', 'true');

    const ocrResponse = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const ocrResult = await ocrResponse.json();

    if (ocrResult && ocrResult.ParsedResults && ocrResult.ParsedResults[0]) {
      return ocrResult.ParsedResults[0].ParsedText as string;
    }
    return '';
  }

  function guessCategory(description: string): string {
    const desc = description.trim().toLowerCase();
    // 1. Check memory first
    if (categoryMemory[desc]) return categoryMemory[desc];

    // 2. Otherwise, guess based on keywords
    if (/rema|coop|kiwi|meny|grocer|butikk|mat/i.test(desc)) return 'Essentials';
    if (/cinema|netflix|spotify|restaurant|kafe|entertain/i.test(desc)) return 'Variable';
    if (/salary|lønn|bonus|income/i.test(desc)) return 'Income';
    if (/saving|fond|aksje|invest|sparekonto/i.test(desc)) return 'Savings';
    return 'Other';
  }

 function parseTransactionsFromText(text: string): ParsedTransaction[] {
  // Split into lines and remove empty
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  let i = 0;
  while (i < lines.length) {
    // Look for date line (e.g., "Torsdag 07.08.25" or "Fredag 08.08.25")
    const dateLine = lines[i];
    const dateMatch = dateLine.match(/([A-Za-zæøåÆØÅ]+)\s+(\d{2})\.(\d{2})\.(\d{2})/);
    if (dateMatch) {
      // Norwegian day and date matched
      // Get merchant/description (likely next line)
      const description = lines[i + 1] || '';
      // Look for amount (could be on the next one or two lines, e.g. -111,00)
      let amount = 0;
      let amountLine = lines[i + 2] || '';
      let catLine = lines[i + 3] || '';
      // Find line with a negative or positive number
      const amountMatch = amountLine.match(/-?\d[\d\s]*[.,]\d{2}/);
      if (!amountMatch && catLine.match(/-?\d[\d\s]*[.,]\d{2}/)) {
        amountLine = catLine; // move to next line if needed
        catLine = '';
      }
      const finalAmountMatch = amountLine.match(/-?\d[\d\s]*[.,]\d{2}/);
      if (finalAmountMatch) {
        amount = Number(finalAmountMatch[0].replace(/\s/g, '').replace(',', '.'));
      }

      // Optional: next line could be a category or notes
      let category = guessCategory(description);
      if (catLine && !catLine.match(/-?\d[\d\s]*[.,]\d{2}/)) {
        category = guessCategory(catLine) || catLine;
      }

      // Date as ISO (format: 2025-08-07)
      const isoDate = `20${dateMatch[4]}-${dateMatch[3]}-${dateMatch[2]}`;

      if (amount !== 0 && description) {
        results.push({
          date: isoDate,
          description: description,
          amount,
          category,
        });
      }

      i += 4; // move to next transaction block
    } else {
      i += 1;
    }
  }

  return results;
}

  // --- Upload & OCR Handler ---
  const handleUploadScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: false,
  quality: 1,
});

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setIsLoading(true);
      try {
        const text = await extractTextFromImage(result.assets[0].uri);
        console.log('OCR result:', text);
        if (!text) alert('No text found in image');
        const parsed = parseTransactionsFromText(text);
        console.log('Parsed transactions:', parsed);
        if (!parsed.length) alert('No transactions could be extracted from the screenshot.');
        setParsedTransactions(parsed);
      } catch (err) {
        alert('Failed to read transactions from image.');
      }
      setIsLoading(false);
    }
  };

  // --- Edit Parsed Transactions (category selection) ---
  const updateParsedCategory = (idx: number, newCategory: string) => {
    setParsedTransactions(parsedTransactions =>
      parsedTransactions.map((tx, i) =>
        i === idx ? { ...tx, category: newCategory } : tx
      )
    );
  };

  // --- Add Parsed Transactions & Remember Choices ---
  const addAllParsed = () => {
    const newMemory = { ...categoryMemory };
    parsedTransactions.forEach(tx => {
      newMemory[tx.description.trim().toLowerCase()] = tx.category;
    });
    setTransactions([
      ...parsedTransactions.map((tx, i) => ({ ...tx, id: Date.now() + i })),
      ...transactions
    ]);
    setCategoryMemory(newMemory);
    setParsedTransactions([]);
    Alert.alert('Added!', 'Parsed transactions have been added.');
  };

  return (
    <View style={styles.container}>
      {/* Upload Screenshot */}
      <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadScreenshot}>
        <Ionicons name="image-outline" size={20} color="#2563eb" style={{ marginRight: 6 }} />
        <Text style={styles.uploadBtnText}>Upload Screenshot</Text>
      </TouchableOpacity>

      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: 200, borderRadius: 10, marginTop: 10, marginBottom: 14 }}
          resizeMode="contain"
        />
      )}

      {isLoading && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={{ color: '#2563eb' }}>Reading transactions from image…</Text>
        </View>
      )}

      {parsedTransactions.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>Parsed from screenshot:</Text>
          {parsedTransactions.map((tx, idx) => (
            <View key={idx} style={[styles.txCard, { borderLeftColor: CATEGORY_COLORS[tx.category] || '#64748b', backgroundColor: '#e0e7ef' }]}>
              <View>
                <Text style={{ fontWeight: '600' }}>{tx.description}</Text>
                <Text style={{ fontSize: 13, color: '#64748b' }}>{tx.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '700', color: tx.amount > 0 ? '#22c55e' : '#ef4444' }}>
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount}
                </Text>
                {/* Category picker */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#334155', marginRight: 6 }}>{tx.category}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      // Cycle category on tap
                      const idxCat = ALL_CATEGORIES.indexOf(tx.category);
                      const nextCat = ALL_CATEGORIES[(idxCat + 1) % ALL_CATEGORIES.length];
                      updateParsedCategory(idx, nextCat);
                    }}
                    style={{ backgroundColor: '#f3f4f6', padding: 4, borderRadius: 7 }}
                  >
                    <Ionicons name="swap-horizontal-outline" size={17} color="#2563eb" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { alignSelf: 'flex-end', marginTop: 4 }]}
            onPress={addAllParsed}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
            <Text style={[styles.addBtnText, { color: '#22c55e' }]}>Add All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Transaction Manually */}
      <View style={styles.addCard}>
        <Text style={styles.addTitle}>Add Transaction</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Date (YYYY-MM-DD)"
            value={form.date}
            onChangeText={date => setForm({ ...form, date })}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            placeholder="Amount"
            value={form.amount}
            keyboardType="numeric"
            onChangeText={amount => setForm({ ...form, amount })}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Description"
            value={form.description}
            onChangeText={description => setForm({ ...form, description })}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            placeholder="Category"
            value={form.category}
            onChangeText={category => setForm({ ...form, category })}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={addTransaction}>
          <Ionicons name="add-circle-outline" size={22} color="#2563eb" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <FlatList
        style={{ flex: 1 }}
        data={transactions}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.txCard, { borderLeftColor: CATEGORY_COLORS[item.category] || '#64748b' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={
                  item.category === 'Income'
                    ? 'cash-outline'
                    : item.category === 'Essentials'
                    ? 'home-outline'
                    : item.category === 'Variable'
                    ? 'cart-outline'
                    : item.category === 'Savings'
                    ? 'trending-up-outline'
                    : 'ellipse-outline'
                }
                size={20}
                color={CATEGORY_COLORS[item.category] || '#64748b'}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.txDesc}>{item.description}</Text>
            </View>
            <View style={styles.txDetails}>
              <Text style={styles.txDate}>{item.date}</Text>
              <Text
                style={[
                  styles.txAmount,
                  { color: item.amount > 0 ? '#22c55e' : '#ef4444' }
                ]}
              >
                {item.amount > 0 ? '+' : ''}
                {item.amount}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 24 }}>
            No transactions yet.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 18
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14
  },
  uploadBtnText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 15
  },
  addCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2
  },
  addTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 7,
    color: '#2563eb'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
    fontSize: 15
  },
  addBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end'
  },
  addBtnText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 4
  },
  txCard: {
    backgroundColor: '#fff',
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  txDesc: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155'
  },
  txDetails: {
    alignItems: 'flex-end'
  },
  txDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700'
  }
});
