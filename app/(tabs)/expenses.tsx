import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../../src/theme/theme';
import { getUserData, setUserData, userDataKeys } from '../../src/storage/userData';

// ==========================================
// 1. TYPES & DATA
// ==========================================

type TransactionType = 'credit' | 'debit';
type PaymentMethod = 'Online' | 'Cash' | 'Card' | 'Bank';

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  date: string; // ISO String
  note?: string;
  isArchived?: boolean;
};

type ExpenseDataStore = {
  transactions: Transaction[];
  currencySymbol: string;
  monthlyBudget: number;
};

// --- PERSISTENCE CONFIGURATION ---
// @ts-ignore
const DOC_DIR = FileSystem.documentDirectory || '';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'General'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Rent', 'Shopping', 'Health', 'Bills', 'Entertainment', 'General'];

const CATEGORY_COLORS: Record<string, string> = {
  'Food': '#F87171', 'Transport': '#60A5FA', 'Rent': '#818CF8', 
  'Shopping': '#F472B6', 'Health': '#34D399', 'Bills': '#FBBF24', 
  'Entertainment': '#A78BFA', 'General': '#9CA3AF',
  'Salary': '#34D399', 'Freelance': '#60A5FA', 'Business': '#FBBF24',
  'Investment': '#818CF8', 'Gift': '#F472B6'
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

const formatCurrency = (amount: number) => {
  return '₹' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// --- STORAGE HELPERS ---

const saveData = async (data: ExpenseDataStore) => {
  try {
    await setUserData(userDataKeys.expenses, JSON.stringify(data));
    // console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving expenses:', error);
  }
};

const loadData = async (): Promise<ExpenseDataStore> => {
  const defaultData: ExpenseDataStore = { transactions: [], currencySymbol: '₹', monthlyBudget: 10000 };
  
  try {
    const content = await getUserData(userDataKeys.expenses);
    if (!content) return defaultData;
    const parsed = JSON.parse(content);

    return {
       transactions: parsed.transactions || [],
       currencySymbol: parsed.currencySymbol || '₹',
       monthlyBudget: parsed.monthlyBudget || 10000
    };
  } catch (error) {
    console.error('Could not load expenses:', error);
    return defaultData;
  }
};

// ==========================================
// 3. MAIN SCREEN
// ==========================================

export default function ExpensesScreen() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'insights'>('dashboard');
  const [data, setData] = useState<ExpenseDataStore>({ transactions: [], currencySymbol: '₹', monthlyBudget: 10000 });
  const [loading, setLoading] = useState(true);

  // --- 1. LOAD ON STARTUP ---
  useEffect(() => {
    let isMounted = true;
    loadData().then((d) => {
      if (isMounted) {
        setData(d);
        setLoading(false); // Only allow saving AFTER loading is done
      }
    });
    return () => { isMounted = false; };
  }, []);

  // --- 2. AUTO-SAVE WHEN DATA CHANGES ---
  useEffect(() => {
    // CRITICAL: Do not save if we are still loading!
    if (!loading) {
        saveData(data);
    }
  }, [data, loading]);

  const addTransaction = (t: Transaction) => {
    setData(prev => ({ ...prev, transactions: [t, ...prev.transactions] }));
  };

  const deleteTransaction = (id: string) => {
    // Hard delete
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
  };

  const archiveTransaction = (id: string) => {
    // Soft delete (Hide from main view)
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, isArchived: true } : t)
    }));
  };

  const importData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const parsedData = JSON.parse(fileContent);

      if (parsedData.transactions && Array.isArray(parsedData.transactions)) {
        Alert.alert('Import', 'Merge or Replace?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Merge', onPress: () => setData(prev => ({ ...prev, transactions: [...parsedData.transactions, ...prev.transactions] })) },
            { text: 'Replace', style: 'destructive', onPress: () => setData(parsedData) }
        ]);
      } else {
        Alert.alert('Error', 'Invalid file format');
      }
    } catch (e) { Alert.alert('Error', 'Import failed'); }
  };

  if (loading) {
    return (
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
            <Text style={{color: '#666'}}>Loading Finances...</Text>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Finance Manager</Text>
          <Text style={styles.headerSubtitle}>Track your wealth</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabBar}>
        <TabButton title="Dashboard" icon="grid-outline" active={activeTab === 'dashboard'} onPress={() => setActiveTab('dashboard')} />
        <TabButton title="History" icon="list-outline" active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
        <TabButton title="Insights" icon="pie-chart-outline" active={activeTab === 'insights'} onPress={() => setActiveTab('insights')} />
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && (
          <DashboardTab 
            data={data} 
            addTransaction={addTransaction} 
            onSeeAll={() => setActiveTab('history')} 
            onDelete={deleteTransaction}
            onArchive={archiveTransaction}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab 
            transactions={data.transactions} 
            onDelete={deleteTransaction} 
            onArchive={archiveTransaction}
            onImport={importData} 
          />
        )}
        {activeTab === 'insights' && (
          <InsightsTab transactions={data.transactions} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 4. TAB: DASHBOARD
// ==========================================

const DashboardTab = ({ data, addTransaction, onSeeAll, onDelete, onArchive }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Filter out archived for calculations
  const activeTransactions = data.transactions.filter((t: Transaction) => !t.isArchived);

  const totalIncome = activeTransactions.filter((t: Transaction) => t.type === 'credit').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
  const totalExpense = activeTransactions.filter((t: Transaction) => t.type === 'debit').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;
  const recentTransactions = activeTransactions.slice(0, 5);

  return (
    <View style={styles.flex1}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <View style={[styles.arrowIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Ionicons name="arrow-down" size={16} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.balanceSubLabel}>Income</Text>
                <Text style={styles.incomeText}>{formatCurrency(totalIncome)}</Text>
              </View>
            </View>
            <View style={styles.balanceItem}>
              <View style={[styles.arrowIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Ionicons name="arrow-up" size={16} color={theme.colors.danger} />
              </View>
              <View>
                <Text style={styles.balanceSubLabel}>Expense</Text>
                <Text style={styles.expenseText}>{formatCurrency(totalExpense)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.map((item: Transaction) => (
          <SwipeableTransaction 
            key={item.id} 
            item={item} 
            onDelete={() => onDelete(item.id)} 
            onArchive={() => onArchive(item.id)} 
          />
        ))}
        {recentTransactions.length === 0 && <Text style={styles.emptyText}>No recent transactions.</Text>}
        <View style={{height: 80}} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <AddTransactionModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onSave={addTransaction} 
      />
    </View>
  );
};

// ==========================================
// 5. TAB: HISTORY
// ==========================================

const HistoryTab = ({ transactions, onDelete, onArchive, onImport }: any) => {
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit' | 'archived'>('all');
  const [search, setSearch] = useState('');

  const filtered = transactions.filter((t: Transaction) => {
    if (filter === 'archived') {
      return t.isArchived === true;
    }
    if (t.isArchived) return false;

    const matchesFilter = filter === 'all' ? true : t.type === filter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    Alert.alert('Export Data', 'Choose format:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'CSV', onPress: () => exportFile('csv') },
      { text: 'JSON', onPress: () => exportFile('json') }
    ]);
  };

  const exportFile = async (format: 'csv' | 'json') => {
    try {
      if (!DOC_DIR) {
        Alert.alert('Error', 'Device storage is not accessible.');
        return;
      }

      let content = '';
      let fileName = `expenses_export.${format}`;

      if (format === 'json') {
        content = JSON.stringify({ transactions: filtered }, null, 2);
      } else {
        content = "Date,Title,Category,Type,Amount\n";
        filtered.forEach((t: Transaction) => {
          content += `${t.date.substring(0,10)},"${t.title}",${t.category},${t.type},${t.amount}\n`;
        });
      }

      const uri = DOC_DIR + fileName;
      await FileSystem.writeAsStringAsync(uri, content, {
        encoding: 'utf8' 
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }

    } catch (error: any) {
      console.error("Export Error:", error);
      Alert.alert('Export Failed', 'An error occurred.');
    }
  };

  return (
    <View style={styles.flex1}>
      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput style={styles.searchInput} placeholder="Search..." value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onImport}><Ionicons name="cloud-upload-outline" size={20} color="#333" /></TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleExport}><Ionicons name="download-outline" size={20} color="#333" /></TouchableOpacity>
      </View>

      <View style={styles.segmentRow}>
        {['all', 'credit', 'debit', 'archived'].map((f) => (
          <TouchableOpacity key={f} style={[styles.segmentBtn, filter === f && styles.segmentActive]} onPress={() => setFilter(f as any)}>
            <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
              {f === 'all' ? 'All' : f === 'credit' ? 'Income' : f === 'debit' ? 'Expense' : 'Archived'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <SwipeableTransaction 
            item={item} 
            onDelete={() => onDelete(item.id)} 
            onArchive={() => onArchive(item.id)} 
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
      />
    </View>
  );
};

// ==========================================
// 6. TAB: INSIGHTS
// ==========================================

const InsightsTab = ({ transactions }: { transactions: Transaction[] }) => {
  const [insightType, setInsightType] = useState<'debit' | 'credit'>('debit');
  const [chartMode, setChartMode] = useState<'bars' | 'ogive'>('bars');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const activeTransactions = transactions.filter(t => !t.isArchived && t.type === insightType);
  const totalAmount = activeTransactions.reduce((acc, c) => acc + c.amount, 0);

  const categoryMap: Record<string, number> = {};
  activeTransactions.forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const sortedCategories = Object.keys(categoryMap)
    .map(cat => ({ 
      name: cat, 
      amount: categoryMap[cat], 
      percentage: totalAmount ? (categoryMap[cat] / totalAmount) * 100 : 0,
      color: CATEGORY_COLORS[cat] || '#9CA3AF'
    }))
    .sort((a, b) => b.amount - a.amount);
  const categorySignature = JSON.stringify(sortedCategories.map(category => category.name));
  const selected = sortedCategories.find(category => category.name === selectedCategory);
  const selectedCumulativeAmount = selected
    ? sortedCategories.slice(0, sortedCategories.indexOf(selected) + 1).reduce((sum, category) => sum + category.amount, 0)
    : totalAmount;

  useEffect(() => {
    const categoryNames: string[] = JSON.parse(categorySignature);
    if (!selectedCategory || !categoryNames.includes(selectedCategory)) {
      setSelectedCategory(categoryNames[0] ?? null);
    }
  }, [insightType, selectedCategory, categorySignature]);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 16 }}>
      
      <View style={styles.insightToggleContainer}>
         <TouchableOpacity 
           style={[styles.insightToggleBtn, insightType === 'debit' && styles.insightToggleActive]}
           onPress={() => setInsightType('debit')}
         >
            <Text style={[styles.insightToggleText, insightType === 'debit' && {color:'#fff'}]}>Expenses</Text>
         </TouchableOpacity>
         <TouchableOpacity 
           style={[styles.insightToggleBtn, insightType === 'credit' && styles.insightToggleActive]}
           onPress={() => setInsightType('credit')}
         >
            <Text style={[styles.insightToggleText, insightType === 'credit' && {color:'#fff'}]}>Income</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeading}>
          <Text style={styles.chartTitle}>
            {insightType === 'debit' ? 'Expense' : 'Income'} {chartMode === 'bars' ? 'By Category' : 'Cumulative Ogive'}
          </Text>
          <View style={styles.chartModeToggle}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="3D bar chart"
              accessibilityState={{ selected: chartMode === 'bars' }}
              style={[styles.chartModeButton, chartMode === 'bars' && styles.chartModeButtonActive]}
              onPress={() => setChartMode('bars')}
            >
              <Ionicons name="stats-chart" size={16} color={chartMode === 'bars' ? '#fff' : '#64748B'} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cumulative ogive chart"
              accessibilityState={{ selected: chartMode === 'ogive' }}
              style={[styles.chartModeButton, chartMode === 'ogive' && styles.chartModeButtonActive]}
              onPress={() => setChartMode('ogive')}
            >
              <Ionicons name="trending-up" size={16} color={chartMode === 'ogive' ? '#fff' : '#64748B'} />
            </TouchableOpacity>
          </View>
        </View>
        {totalAmount > 0 ? (
          <View style={styles.chartContent}>
            <View style={styles.chartSelection}>
              <View style={[styles.selectionSwatch, { backgroundColor: selected?.color ?? theme.colors.primary }]} />
              <View style={styles.selectionCopy}>
                <Text style={styles.selectionName}>{selected?.name ?? 'All categories'}</Text>
                <Text style={styles.chartSub}>
                  {selected
                    ? chartMode === 'ogive'
                      ? `${((selectedCumulativeAmount / totalAmount) * 100).toFixed(1)}% cumulative`
                      : `${selected.percentage.toFixed(1)}% of total`
                    : 'Select a category'}
                </Text>
              </View>
              <Text style={styles.chartTotal}>
                {formatCurrency(chartMode === 'ogive' ? selectedCumulativeAmount : selected?.amount ?? totalAmount)}
              </Text>
            </View>
            <InteractiveInsightChart
              data={sortedCategories}
              mode={chartMode}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
            <Text style={styles.chartHint}>Tap a {chartMode === 'bars' ? 'bar' : 'point'} to inspect a category</Text>
          </View>
        ) : (
          <Text style={{textAlign:'center', color:'#999', marginVertical:20}}>No data</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Categories</Text>
      
      {sortedCategories.map((cat) => (
        <TouchableOpacity
          key={cat.name}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedCategory === cat.name }}
          onPress={() => setSelectedCategory(cat.name)}
          style={[styles.statRow, selectedCategory === cat.name && styles.statRowSelected]}
        >
          <View style={styles.statInfo}>
             <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <Text style={styles.statName}>{cat.name}</Text>
             </View>
             <Text style={styles.statAmount}>{formatCurrency(cat.amount)}</Text>
          </View>
          <View style={styles.progressBarBg}>
             <View style={[styles.progressBarFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
          </View>
          <Text style={styles.statPercent}>{cat.percentage.toFixed(1)}%</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

type InsightCategory = { name: string; amount: number; percentage: number; color: string };

const InteractiveInsightChart = ({
  data,
  mode,
  selectedCategory,
  onSelect
}: {
  data: InsightCategory[];
  mode: 'bars' | 'ogive';
  selectedCategory: string | null;
  onSelect: (category: string) => void;
}) => {
  const itemWidth = 64;
  const chartWidth = Math.max(280, data.length * itemWidth);
  const plotHeight = 150;
  const maxAmount = Math.max(...data.map(item => item.amount), 1);
  const cumulativeTotal = data.reduce((total, item) => total + item.amount, 0);
  const points = data.map((item, index) => ({
    x: index * itemWidth + itemWidth / 2,
    y: plotHeight - ((data.slice(0, index + 1).reduce((total, entry) => total + entry.amount, 0) / cumulativeTotal) * (plotHeight - 16)),
    item
  }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
      <View style={[styles.chartPlot, { width: chartWidth, height: plotHeight + 34 }]}>
        <View style={styles.chartBaseline} />
        {mode === 'bars' ? data.map(item => {
          const barHeight = Math.max(8, (item.amount / maxAmount) * (plotHeight - 18));
          const isSelected = selectedCategory === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${formatCurrency(item.amount)}, ${item.percentage.toFixed(1)} percent`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(item.name)}
              style={[styles.chartBarColumn, { width: itemWidth }]}
            >
              <View style={[styles.chartBar, { height: barHeight, backgroundColor: item.color, opacity: isSelected ? 1 : 0.76 }]}>
                <View style={[styles.chartBarTop, { backgroundColor: item.color }]} />
                <View style={[styles.chartBarSide, { backgroundColor: item.color }]} />
              </View>
              <Text numberOfLines={1} style={[styles.chartCategoryLabel, isSelected && styles.chartCategoryLabelSelected]}>{item.name}</Text>
            </TouchableOpacity>
          );
        }) : (
          <>
            {points.slice(0, -1).map((point, index) => {
              const next = points[index + 1];
              const dx = next.x - point.x;
              const dy = next.y - point.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = `${Math.atan2(dy, dx)}rad`;
              return (
                <View
                  key={`line-${point.item.name}`}
                  pointerEvents="none"
                  style={[styles.ogiveLine, { width: length, left: (point.x + next.x - length) / 2, top: (point.y + next.y) / 2, transform: [{ rotate: angle }] }]}
                />
              );
            })}
            {points.map(({ x, y, item }) => {
              const isSelected = selectedCategory === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, cumulative ${formatCurrency(data.slice(0, data.indexOf(item) + 1).reduce((total, entry) => total + entry.amount, 0))}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(item.name)}
                  style={[styles.ogivePoint, { left: x - 9, top: y - 9, backgroundColor: item.color }, isSelected && styles.ogivePointSelected]}
                />
              );
            })}
            <View style={styles.ogiveLabels}>
              {data.map(item => (
                <Text key={item.name} numberOfLines={1} style={[styles.chartCategoryLabel, { width: itemWidth }, selectedCategory === item.name && styles.chartCategoryLabelSelected]}>{item.name}</Text>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

// ==========================================
// 7. SWIPEABLE CARD COMPONENT
// ==========================================

const SwipeableTransaction = ({ item, onDelete, onArchive }: { item: Transaction, onDelete: () => void, onArchive: () => void }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 120) {
          // Swipe Right -> Delete
          Animated.timing(pan, { toValue: { x: 500, y: 0 }, duration: 200, useNativeDriver: false }).start(() => {
             onDelete();
          });
        } else if (gestureState.dx < -120) {
          // Swipe Left -> Archive
          Animated.timing(pan, { toValue: { x: -500, y: 0 }, duration: 200, useNativeDriver: false }).start(() => {
             onArchive();
          });
        } else {
          // Reset
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeBackLayer}>
         <View style={styles.swipeLeftAction}><Ionicons name="trash" size={24} color="#fff" /></View>
         <View style={styles.swipeRightAction}><Ionicons name="archive" size={24} color="#fff" /></View>
      </View>

      <Animated.View 
        style={[
          { transform: [{ translateX: pan.x }], backgroundColor: '#fff', borderRadius: 16 }, 
        ]} 
        {...panResponder.panHandlers}
      >
        <TransactionCard item={item} />
      </Animated.View>
    </View>
  );
};

const TransactionCard = ({ item }: { item: Transaction }) => {
  const isCredit = item.type === 'credit';
  return (
    <View style={styles.transCard}>
      <View style={[styles.iconBox, { backgroundColor: isCredit ? '#DCFCE7' : '#FEE2E2' }]}>
        <FontAwesome5 name={isCredit ? 'arrow-down' : 'shopping-bag'} size={18} color={isCredit ? '#16A34A' : '#EF4444'} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.transTitle}>{item.title}</Text>
        <Text style={styles.transSub}>{item.category} • {item.paymentMethod} • {formatDate(item.date)}</Text>
      </View>
      <Text style={[styles.transAmount, { color: isCredit ? '#16A34A' : '#1F2937' }]}>
        {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </View>
  );
};

// ==========================================
// 8. ADD MODAL
// ==========================================

const AddTransactionModal = ({ visible, onClose, onSave }: any) => {
  const [type, setType] = useState<TransactionType>('debit');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Online');
  const [date, setDate] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateText, setDateText] = useState('');

  useEffect(() => {
    if (visible) {
      setAmount(''); setTitle(''); 
      setCategory('General'); 
      setPaymentMethod('Online'); 
      setDate(new Date());
      setDateText('');
      setShowDatePicker(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!title) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    let finalDate = date;
    if (showDatePicker && dateText) {
       const parts = dateText.split('-');
       if(parts.length === 3) {
         finalDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
       }
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      title,
      amount: parseFloat(amount),
      type,
      category,
      paymentMethod,
      date: finalDate.toISOString(),
      isArchived: false,
    };

    onSave(newTx);
    onClose();
  };

  const categories = type === 'credit' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
           <Text style={styles.modalTitle}>Add Transaction</Text>
           <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
        </View>
        
          <ScrollView style={styles.modalContent}>
          <View style={styles.typeSegment}>
            <TouchableOpacity onPress={() => setType('debit')} style={[styles.typeBtn, type === 'debit' && styles.typeBtnActiveDebit]}>
               <Text style={[styles.typeText, type === 'debit' && { color: '#fff' }]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setType('credit')} style={[styles.typeBtn, type === 'credit' && styles.typeBtnActiveCredit]}>
               <Text style={[styles.typeText, type === 'credit' && { color: '#fff' }]}>Income</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput style={styles.amountInput} placeholder="0.00" keyboardType="numeric" value={amount} onChangeText={setAmount} autoFocus />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.textInput} placeholder="What is this for?" value={title} onChangeText={setTitle} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 8 }}>
              {categories.map(cat => (
                <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[styles.chip, category === cat && styles.chipActive]}>
                  <Text style={[styles.chipText, category === cat && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.rowWrap}>
              {['Online', 'Cash', 'Card', 'Bank'].map((method) => (
                <TouchableOpacity key={method} onPress={() => setPaymentMethod(method as PaymentMethod)} style={[styles.methodCard, paymentMethod === method && styles.methodCardActive]}>
                  <Ionicons name={method === 'Cash' ? 'cash-outline' : method === 'Card' ? 'card-outline' : method === 'Online' ? 'wifi' : 'business-outline'} size={20} color={paymentMethod === method ? theme.colors.primary : '#666'} />
                  <Text style={[styles.methodText, paymentMethod === method && { color: theme.colors.primary, fontWeight:'bold' }]}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(!showDatePicker)}>
                   <Text style={{color: theme.colors.primary}}>{showDatePicker ? 'Use Today' : 'Change Date'}</Text>
                </TouchableOpacity>
              </View>
              {!showDatePicker ? <Text style={styles.dateDisplay}>{date.toDateString()}</Text> : <TextInput style={styles.textInput} placeholder="YYYY-MM-DD" value={dateText} onChangeText={setDateText} />}
          </View>

          <View style={{height: 40}} />
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Transaction</Text>
          </TouchableOpacity>
          <View style={{height: 60}} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ==========================================
// 9. STYLES
// ==========================================

const TabButton = ({ title, icon, active, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
    <Ionicons name={icon} size={20} color={active ? theme.colors.primary : '#888'} />
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },

  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6B7280' },
  headerIconBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },

  tabBar: { flexDirection: 'row', padding: 6, marginHorizontal: 16, marginTop: 16, backgroundColor: '#E5E7EB', borderRadius: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { marginLeft: 6, fontWeight: '600', color: '#6B7280', fontSize: 13 },
  tabTextActive: { color: theme.colors.primary, fontWeight: '700' },

  content: { flex: 1, marginTop: 10 },

  // Dashboard
  balanceCard: { backgroundColor: '#111827', borderRadius: 20, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  balanceLabel: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 8 },
  balanceRow: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  balanceItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  arrowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  balanceSubLabel: { color: '#9CA3AF', fontSize: 12 },
  incomeText: { color: '#4ADE80', fontWeight: '700', fontSize: 16 },
  expenseText: { color: '#F87171', fontWeight: '700', fontSize: 16 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  seeAllText: { color: theme.colors.primary, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },

  // Swipeable
  swipeContainer: { marginBottom: 10, position: 'relative' },
  swipeBackLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  swipeLeftAction: { backgroundColor: '#EF4444', position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, justifyContent: 'center', paddingLeft: 20 },
  swipeRightAction: { backgroundColor: '#3B82F6', position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', borderTopRightRadius: 16, borderBottomRightRadius: 16, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20 },

  transCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  transTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  transSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  transAmount: { fontSize: 16, fontWeight: '700' },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: theme.colors.primary, shadowOpacity: 0.4, shadowOffset: {width:0, height:4}, shadowRadius: 8, elevation: 6 },

  // History Tab
  filterContainer: { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  iconBtn: { width: 44, height: 44, backgroundColor: '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentRow: { flexDirection: 'row', padding: 16 },
  segmentBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  segmentActive: { backgroundColor: '#1F2937' },
  segmentText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#fff' },

  // Insights
  insightToggleContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', padding: 4, borderRadius: 12, marginBottom: 20 },
  insightToggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  insightToggleActive: { backgroundColor: theme.colors.primary },
  insightToggleText: { fontWeight: '600', color: '#6B7280' },

  chartCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'stretch', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  chartHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  chartTitle: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  chartModeToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 3 },
  chartModeButton: { width: 34, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  chartModeButtonActive: { backgroundColor: theme.colors.primary },
  chartContent: { alignItems: 'stretch' },
  chartSelection: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  selectionSwatch: { width: 10, height: 10, borderRadius: 5, marginRight: 9 },
  selectionCopy: { flex: 1 },
  selectionName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  chartTotal: { fontSize: 16, fontWeight: '800', color: '#111' },
  chartSub: { fontSize: 12, color: '#9CA3AF' },
  chartPlot: { position: 'relative', marginTop: 6 },
  chartBaseline: { position: 'absolute', left: 0, right: 0, bottom: 31, height: 1, backgroundColor: '#E2E8F0' },
  chartBarColumn: { position: 'absolute', bottom: 0, height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 0 },
  chartBar: { width: 30, marginBottom: 30, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartBarTop: { position: 'absolute', top: -6, left: 0, width: 30, height: 7, borderTopLeftRadius: 3, transform: [{ skewX: '-35deg' }], opacity: 0.65 },
  chartBarSide: { position: 'absolute', top: -3, right: -7, bottom: 0, width: 7, transform: [{ skewY: '-25deg' }], opacity: 0.48 },
  chartCategoryLabel: { position: 'absolute', bottom: 7, width: 64, textAlign: 'center', color: '#64748B', fontSize: 10 },
  chartCategoryLabelSelected: { color: '#111827', fontWeight: '700' },
  chartHint: { alignSelf: 'center', marginTop: 2, color: '#94A3B8', fontSize: 11 },
  ogiveLine: { position: 'absolute', height: 3, backgroundColor: '#334155', borderRadius: 2 },
  ogivePoint: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#fff', elevation: 2 },
  ogivePointSelected: { width: 22, height: 22, borderRadius: 11, borderWidth: 4 },
  ogiveLabels: { position: 'absolute', left: 0, right: 0, bottom: 7, flexDirection: 'row' },
  
  statRow: { marginBottom: 16, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F9FAFB' },
  statRowSelected: { borderColor: theme.colors.primary, backgroundColor: '#F8FBFF' },
  statInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statName: { fontSize: 15, fontWeight: '600', color: '#333' },
  statAmount: { fontWeight: '700', color: '#1F2937' },
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  statPercent: { fontSize: 11, color: '#999', textAlign: 'right' },

  // Modal
  modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { padding: 20 },
  typeSegment: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 12, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeBtnActiveDebit: { backgroundColor: '#EF4444' },
  typeBtnActiveCredit: { backgroundColor: '#16A34A' },
  typeText: { fontWeight: '700', color: '#666' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  amountInput: { fontSize: 32, fontWeight: '700', color: '#111', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 8 },
  textInput: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#1F2937', borderColor: '#1F2937' },
  chipText: { fontWeight: '600', color: '#4B5563' },
  methodCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 10, marginBottom: 10, backgroundColor: '#fff' },
  methodCardActive: { borderColor: theme.colors.primary, backgroundColor: '#EFF6FF' },
  methodText: { marginLeft: 6, color: '#666', fontWeight: '500' },
  dateDisplay: { fontSize: 16, fontWeight: '600', color: '#111', marginTop: 4 },
  saveButton: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowOffset: {width:0, height:4} },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});