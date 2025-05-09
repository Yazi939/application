import React, { useState, useEffect } from 'react';
import type { RadioChangeEvent } from 'antd/es/radio';
import type { ColumnsType } from 'antd/es/table';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Radio,
  Space,
  Divider,
  Typography,
  Select,
  Alert,
  Button,
  Tag
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './Dashboard.module.css';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

// Типы топлива
const FUEL_TYPES = [
  { value: 'diesel', label: 'Дизельное топливо' },
  { value: 'gasoline_92', label: 'Бензин АИ-92' },
  { value: 'gasoline_95', label: 'Бензин АИ-95' },
  { value: 'gasoline_98', label: 'Бензин АИ-98' },
  { value: 'gas', label: 'Газ' }
];

// Данные для графика расхода топлива
const fuelData = [
  { name: 'Пн', расход: 340 },
  { name: 'Вт', расход: 420 },
  { name: 'Ср', расход: 380 },
  { name: 'Чт', расход: 450 },
  { name: 'Пт', расход: 520 },
  { name: 'Сб', расход: 300 },
  { name: 'Вс', расход: 280 },
];

// Данные для круговой диаграммы
const vehicleTypeData = [
  { name: 'Катера', value: 40 },
  { name: 'Яхты', value: 35 },
  { name: 'Баржи', value: 25 },
];

// Цвета для круговой диаграммы
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Данные для таблицы
interface VehicleData {
  key: string;
  id: string;
  type: string;
  model: string;
  fuelType: string;
  consumption: number;
  lastRefuel: string;
}

// Интерфейс для транзакций топлива
interface FuelTransaction {
  key: string;
  type: 'purchase' | 'sale';
  volume: number;
  price: number;
  totalCost: number;
  date: string;
  timestamp: number;
  fuelType: string;
  supplier?: string;
  customer?: string;
  notes?: string;
}

// Интерфейс для данных по типам топлива
interface FuelTypeData {
  fuelType: string;
  fuelName: string;
  purchased: number;
  sold: number;
  balance: number;
  purchaseCost: number;
  saleIncome: number;
  profit: number;
}

// Интерфейс для данных по периодам (месяцам/дням)
interface PeriodData {
  name: string;
  purchased: number;
  sold: number;
  profit: number;
  timestamp: number;
}

const vehiclesData: VehicleData[] = [
    {
      key: '1',
    id: 'ТС-001',
    type: 'Катер',
    model: 'Yamaha AR240',
    fuelType: 'АИ-95',
    consumption: 45.2,
    lastRefuel: '2024-04-08',
    },
    {
      key: '2',
    id: 'ТС-002',
    type: 'Яхта',
    model: 'Azimut 54',
    fuelType: 'Дизель',
    consumption: 120.5,
    lastRefuel: '2024-04-07',
  },
  {
    key: '3',
    id: 'ТС-003',
    type: 'Баржа',
    model: 'River Master 85',
    fuelType: 'Дизель',
    consumption: 210.8,
    lastRefuel: '2024-04-08',
  },
];

const columns: ColumnsType<VehicleData> = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
  {
    title: 'Тип ТС',
    dataIndex: 'type',
    key: 'type',
  },
  {
    title: 'Модель',
    dataIndex: 'model',
    key: 'model',
  },
  {
    title: 'Тип топлива',
    dataIndex: 'fuelType',
    key: 'fuelType',
  },
  {
    title: 'Расход л/100км',
    dataIndex: 'consumption',
    key: 'consumption',
  },
  {
    title: 'Последняя заправка',
    dataIndex: 'lastRefuel',
    key: 'lastRefuel',
  },
];

// Функция группировки данных по месяцам
const groupByMonth = (transactions: FuelTransaction[]): PeriodData[] => {
  const monthMap = new Map<string, PeriodData>();
  
  transactions.forEach(t => {
    const date = new Date(t.timestamp);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthKey = `${year}-${month+1}`;
    const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        name: monthName,
        purchased: 0,
        sold: 0,
        profit: 0,
        timestamp: new Date(year, month, 1).getTime()
      });
    }
    
    const data = monthMap.get(monthKey)!;
    
    if (t.type === 'purchase') {
      data.purchased += t.volume;
      data.profit -= t.totalCost;
    } else {
      data.sold += t.volume;
      data.profit += t.totalCost;
    }
  });
  
  // Сортировка по времени
  return Array.from(monthMap.values())
    .sort((a, b) => a.timestamp - b.timestamp);
};

// Расчет процентного изменения между двумя значениями
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<string>('month');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [filterFuelType, setFilterFuelType] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [fuelTypeData, setFuelTypeData] = useState<FuelTypeData[]>([]);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Обработчики фильтров
  const handlePeriodChange = (e: RadioChangeEvent) => {
    setPeriod(e.target.value);
  };
  
  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
  };
  
  const handleFuelTypeChange = (value: string | null) => {
    setFilterFuelType(value);
  };
  
  const handleResetFilters = () => {
    setDateRange(null);
    setFilterFuelType(null);
  };

  // Фильтрация транзакций
  const filterTransactions = (transactions: FuelTransaction[]): FuelTransaction[] => {
    return transactions.filter(t => {
      let matchesDateRange = true;
      let matchesFuelType = true;
      
      // Фильтр по дате
      if (dateRange && dateRange[0] && dateRange[1]) {
        const transactionDate = t.timestamp;
        const startDate = dateRange[0].startOf('day').valueOf();
        const endDate = dateRange[1].endOf('day').valueOf();
        matchesDateRange = transactionDate >= startDate && transactionDate <= endDate;
      }
      
      // Фильтр по типу топлива
      if (filterFuelType) {
        matchesFuelType = t.fuelType === filterFuelType;
      }
      
      return matchesDateRange && matchesFuelType;
    });
  };

  // Загрузка данных из localStorage
  const loadData = () => {
    setIsLoading(true);
    
    try {
      const savedTransactions = localStorage.getItem('fuelTransactions');
      
      if (savedTransactions) {
        const allTransactions = JSON.parse(savedTransactions);
        setTransactions(allTransactions);
        
        // Применяем фильтры
        const filteredTransactions = filterTransactions(allTransactions);
        
        // Рассчитываем данные по типам топлива
        const typesData = FUEL_TYPES.map(fuelType => {
          const fuelTransactions = filteredTransactions.filter(
            (t: FuelTransaction) => t.fuelType === fuelType.value
          );
          const purchased = fuelTransactions
            .filter((t: FuelTransaction) => t.type === 'purchase')
            .reduce((sum: number, t: FuelTransaction) => sum + t.volume, 0);
          const sold = fuelTransactions
            .filter((t: FuelTransaction) => t.type === 'sale')
            .reduce((sum: number, t: FuelTransaction) => sum + t.volume, 0);
          const purchaseCost = fuelTransactions
            .filter((t: FuelTransaction) => t.type === 'purchase')
            .reduce((sum: number, t: FuelTransaction) => sum + t.totalCost, 0);
          const saleIncome = fuelTransactions
            .filter((t: FuelTransaction) => t.type === 'sale')
            .reduce((sum: number, t: FuelTransaction) => sum + t.totalCost, 0);
          
          return {
            fuelType: fuelType.value,
            fuelName: fuelType.label,
            purchased,
            sold,
            balance: purchased - sold,
            purchaseCost,
            saleIncome,
            profit: saleIncome - purchaseCost
          };
        }).filter(data => data.purchased > 0 || data.sold > 0);
        
        setFuelTypeData(typesData);
        
        // Группируем транзакции по периодам
        const periodData = groupByMonth(filteredTransactions);
        setPeriodData(periodData);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка данных при первой загрузке и изменении фильтров
  useEffect(() => {
    loadData();
  }, [dateRange, filterFuelType, period]);

  // Расчет общих показателей
  const filteredTransactions = filterTransactions(transactions);
  
  const totalPurchased = filteredTransactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.volume, 0);
    
  const totalSold = filteredTransactions
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.volume, 0);
    
  const totalPurchaseCost = filteredTransactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.totalCost, 0);
    
  const totalSaleIncome = filteredTransactions
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.totalCost, 0);

  const totalProfit = totalSaleIncome - totalPurchaseCost;
  const fuelBalance = totalPurchased - totalSold;

  // Расчет данных для сравнения с предыдущим периодом
  const calculatePreviousPeriodData = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const currentStart = dateRange[0].valueOf();
      const currentEnd = dateRange[1].valueOf();
      const periodLength = currentEnd - currentStart;
      
      // Расчёт предыдущего периода такой же длительности
      const previousStart = currentStart - periodLength;
      const previousEnd = currentStart - 1;
      
      const previousPeriodTransactions = transactions.filter(t => {
        return t.timestamp >= previousStart && t.timestamp <= previousEnd;
      });
      
      const previousPurchased = previousPeriodTransactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + t.volume, 0);
        
      const previousSold = previousPeriodTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + t.volume, 0);
        
      const previousPurchaseCost = previousPeriodTransactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + t.totalCost, 0);
        
      const previousSaleIncome = previousPeriodTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + t.totalCost, 0);
      
      const previousProfit = previousSaleIncome - previousPurchaseCost;
      
      return {
        purchasedChange: calculateChange(totalPurchased, previousPurchased),
        soldChange: calculateChange(totalSold, previousSold),
        profitChange: calculateChange(totalProfit, previousProfit)
      };
    }
    
    return {
      purchasedChange: 0,
      soldChange: 0,
      profitChange: 0
    };
  };

  const { purchasedChange, soldChange, profitChange } = calculatePreviousPeriodData();
  
  // Данные для круговой диаграммы остатков топлива
  const fuelBalanceData = fuelTypeData.filter(data => data.balance > 0);
  
  // Данные для графика транзакций по времени
  const getTransactionsTimeData = () => {
    if (periodData.length === 0) return [];
    
    return periodData.map(item => ({
      name: item.name,
      Покупка: item.purchased,
      Продажа: item.sold,
      Прибыль: item.profit
    }));
  };

  const transactionsTimeData = getTransactionsTimeData();

  return (
    <div className={styles.dashboard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Панель управления расходом топлива</h1>
        <Space>
          <RangePicker 
            value={dateRange} 
            onChange={handleDateRangeChange}
            placeholder={['Начало', 'Конец']} 
          />
          <Select
            allowClear
            placeholder="Тип топлива"
            style={{ width: 160 }}
            onChange={handleFuelTypeChange}
            value={filterFuelType}
          >
            {FUEL_TYPES.map(type => (
              <Option key={type.value} value={type.value}>{type.label}</Option>
            ))}
          </Select>
          <Radio.Group value={period} onChange={handlePeriodChange}>
            <Radio.Button value="week">Неделя</Radio.Button>
            <Radio.Button value="month">Месяц</Radio.Button>
            <Radio.Button value="year">Год</Radio.Button>
            </Radio.Group>
          <Button 
            icon={<ReloadOutlined onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}} />} 
            onClick={handleResetFilters}
            disabled={!dateRange && !filterFuelType}
          >
            Сбросить
          </Button>
          </Space>
      </div>
      
      {dateRange && (
        <Alert
          message={
            <span>
              Показаны данные за период: <b>{dateRange[0]?.format('DD.MM.YYYY')} - {dateRange[1]?.format('DD.MM.YYYY')}</b>
              {filterFuelType && (
                <span>
                  {' '}Тип топлива: <Tag color="blue">{FUEL_TYPES.find(t => t.value === filterFuelType)?.label}</Tag>
                </span>
              )}
            </span>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={handleResetFilters}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Расход топлива"
              value={1834.47}
              precision={2}
              suffix="л"
              valueStyle={{ color: 'var(--success-color)' }}
              prefix="↑"
            />
            <div style={{ color: '#52c41a', fontSize: '14px', marginTop: '8px' }}>+8% к прошлому периоду</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Затраты на топливо"
              value={92567.80}
              precision={2}
              suffix="₽"
              valueStyle={{ color: 'var(--warning-color)' }}
              prefix="↑"
            />
            <div style={{ color: '#faad14', fontSize: '14px', marginTop: '8px' }}>+12% к прошлому периоду</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Активный транспорт"
              value={15}
              suffix="ед."
              valueStyle={{ color: 'var(--info-color)' }}
            />
            <div style={{ color: '#1890ff', fontSize: '14px', marginTop: '8px' }}>Всего в автопарке: 18</div>
          </Card>
        </Col>
      </Row>

      {transactions.length > 0 && (
        <>
          <Divider orientation="left">
            <Title level={4}>Учет топлива</Title>
          </Divider>

      <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Закуплено топлива"
                  value={totalPurchased}
                  precision={2}
                  suffix="л"
                  valueStyle={{ color: '#1890ff' }}
                />
                {dateRange && (
                  <div style={{ 
                    color: purchasedChange > 0 ? '#3f8600' : purchasedChange < 0 ? '#cf1322' : '#999',
                    fontSize: '14px', 
                    marginTop: '8px' 
                  }}>
                    {purchasedChange > 0 ? '↑' : purchasedChange < 0 ? '↓' : '='}
                    {' '}{Math.abs(purchasedChange).toFixed(1)}% к прошлому периоду
                  </div>
                )}
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Продано топлива"
                  value={totalSold}
                  precision={2}
                  suffix="л"
                  valueStyle={{ color: '#1890ff' }}
                />
                {dateRange && (
                  <div style={{ 
                    color: soldChange > 0 ? '#3f8600' : soldChange < 0 ? '#cf1322' : '#999',
                    fontSize: '14px', 
                    marginTop: '8px' 
                  }}>
                    {soldChange > 0 ? '↑' : soldChange < 0 ? '↓' : '='}
                    {' '}{Math.abs(soldChange).toFixed(1)}% к прошлому периоду
                  </div>
                )}
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Остаток топлива"
                  value={fuelBalance}
                  precision={2}
                  suffix="л"
                  valueStyle={{ color: fuelBalance > 0 ? '#3f8600' : '#cf1322' }}
                  prefix={fuelBalance > 0 ? "↑" : "↓"}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Прибыль"
                  value={totalProfit}
                  precision={2}
                  suffix="₽"
                  valueStyle={{ color: totalProfit > 0 ? '#3f8600' : '#cf1322' }}
                  prefix={totalProfit > 0 ? "↑" : "↓"}
                />
                {dateRange && (
                  <div style={{ 
                    color: profitChange > 0 ? '#3f8600' : profitChange < 0 ? '#cf1322' : '#999',
                    fontSize: '14px', 
                    marginTop: '8px' 
                  }}>
                    {profitChange > 0 ? '↑' : profitChange < 0 ? '↓' : '='}
                    {' '}{Math.abs(profitChange).toFixed(1)}% к прошлому периоду
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col span={24}>
              <Card title="Динамика операций по топливу">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={transactionsTimeData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Покупка" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="Продажа" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col span={12}>
              <Card 
                title="Остаток топлива по типам" 
                extra={
                  <Button type="text" onClick={loadData} icon={<ReloadOutlined onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}} />} loading={isLoading}>
                    Обновить
                  </Button>
                }
              >
                <Table 
                  dataSource={fuelTypeData} 
                  rowKey="fuelType"
                  pagination={false}
                  size="small"
                  loading={isLoading}
                >
                  <Table.Column title="Тип топлива" dataIndex="fuelName" />
                  <Table.Column 
                    title="Закуплено (л)" 
                    dataIndex="purchased" 
                    render={(val) => val.toFixed(2)}
                  />
                  <Table.Column 
                    title="Продано (л)" 
                    dataIndex="sold" 
                    render={(val) => val.toFixed(2)}
                  />
                  <Table.Column 
                    title="Остаток (л)" 
                    dataIndex="balance" 
                    render={(val) => val.toFixed(2)}
                    sorter={(a: FuelTypeData, b: FuelTypeData) => a.balance - b.balance}
                  />
                </Table>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Распределение остатков топлива">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={fuelBalanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="balance"
                      nameKey="fuelName"
                    >
                      {fuelBalanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)} л`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col span={24}>
              <Card title="Динамика прибыли">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={transactionsTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)} ₽`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="Прибыль" 
                      stroke="#ff7300" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={16}>
          <Card title="График расхода топлива">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fuelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="расход" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Распределение по типам ТС">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vehicleTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehicleTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Транспортные средства" style={{ marginTop: '16px' }}>
        <Table columns={columns} dataSource={vehiclesData} />
          </Card>
    </div>
  );
};

export default Dashboard; 