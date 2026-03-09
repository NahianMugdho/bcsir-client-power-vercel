import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const API = "https://bcsir-server-power.onrender.com"

// const API = "http://localhost:3000"
const topicLabels = {
    'BCSIRbus':     'Bus Voltage',
    'BCSIRshunt':   'Shunt Voltage',
    'BCSIRload':    'Load',
    'BCSIRcurrent': 'Current',
    'BCSIRpower':   'Power'
  }

  const topicUnits = {
    'BCSIRbus':     'V',
    'BCSIRshunt':   'mV',
    'BCSIRload':    'Ω',
    'BCSIRcurrent': 'A',
    'BCSIRpower':   'W'
  }

  const topicColors = {
    'BCSIRbus':     'from-blue-50 to-blue-100 border-blue-200 text-blue-900',
    'BCSIRshunt':   'from-purple-50 to-purple-100 border-purple-200 text-purple-900',
    'BCSIRload':    'from-orange-50 to-orange-100 border-orange-200 text-orange-900',
    'BCSIRcurrent': 'from-green-50 to-green-100 border-green-200 text-green-900',
    'BCSIRpower':   'from-red-50 to-red-100 border-red-200 text-red-900',
  }


//Chart Update

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-bold text-gray-900">
          {payload[0].value} <span className="font-normal text-gray-500">{unit}</span>
        </p>
      </div>
    )
  }
  return null
}

function SensorChart({ topic, data }) {

  const lineColors = {
    'BCSIRbus': '#3b82f6', 'BCSIRshunt': '#a855f7',
    'BCSIRload': '#f97316', 'BCSIRcurrent': '#22c55e', 'BCSIRpower': '#ef4444'
  }
  const unit = topicUnits[topic]
  const tickStep = Math.max(1, Math.floor(data.length / 8))
  const ticks = data.filter((_, i) => i % tickStep === 0).map(d => d.label)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{topicLabels[topic]}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{unit}</span>
      </div>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" ticks={ticks} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line type="monotone" dataKey="value" stroke={lineColors[topic]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
      <p className="text-xs text-gray-400 mt-2 text-right">{data.length} pts</p>
    </div>
  )
}



//Chart Update End

function App() {
  const [currentData, setCurrentData] = useState({})
  const [latestRecords, setLatestRecords] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
const [activeTopics, setActiveTopics] = useState([])
const [chartRange, setChartRange] = useState('today')
const [customFrom, setCustomFrom] = useState('')
const [customTo, setCustomTo]   = useState('')
const [allChartRecords, setAllChartRecords] = useState([])
const [chartLoading, setChartLoading] = useState(false)
const toggleTopic = (topic) => {
  setActiveTopics(prev =>
    prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
  )
}

// Build per-topic chart data sorted ascending by timestamp
// const chartData = (() => {
//   const byTopic = {}
//   Object.keys(topicLabels).forEach(t => (byTopic[t] = []))
//   latestRecords.forEach(r => {
//     if (byTopic[r.topic] !== undefined) {
//       byTopic[r.topic].push({
//         time: r.timestamp,
//         label: new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false }),
//         value: parseFloat(r.value),
//       })
//     }
//   })
//   Object.keys(byTopic).forEach(t => {
//     byTopic[t].sort((a, b) => new Date(a.time) - new Date(b.time))
//   })
//   return byTopic
// })()
// Filter allChartRecords by selected date range
// const filteredChartRecords = (() => {
//   const now = new Date()
//   let from, to

//   if (chartRange === 'today') {
//     from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
//     to   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
//   } else if (chartRange === '7days') {
//     from = new Date(now - 7 * 24 * 60 * 60 * 1000)
//     to   = now
//   } else if (chartRange === '30days') {
//     from = new Date(now - 30 * 24 * 60 * 60 * 1000)
//     to   = now
//   } else if (chartRange === 'custom' && customFrom && customTo) {
//     from = new Date(customFrom)
//     to   = new Date(customTo)
//     to.setHours(23, 59, 59)
//   } else {
//     return allChartRecords
//   }

//   return allChartRecords.filter(r => {
//     const t = new Date(r.timestamp)
//     return t >= from && t <= to
//   })
// })()

// // Build per-topic chart data sorted ascending by timestamp
// const chartData = (() => {
//   const byTopic = {}
//   Object.keys(topicLabels).forEach(t => (byTopic[t] = []))
//   filteredChartRecords.forEach(r => {
//     if (byTopic[r.topic] !== undefined) {
//       byTopic[r.topic].push({
//         time:  r.timestamp,
//         label: new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false }),
//         value: parseFloat(r.value),
//       })
//     }
//   })
//   Object.keys(byTopic).forEach(t => {
//     byTopic[t].sort((a, b) => new Date(a.time) - new Date(b.time))
//   })
//   return byTopic
// })()
const filteredChartRecords = useMemo(() => {
  const now = new Date()
  let from, to

  if (chartRange === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    to   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  } else if (chartRange === '7days') {
    from = new Date(now - 7 * 24 * 60 * 60 * 1000)
    to   = now
  } else if (chartRange === '30days') {
    from = new Date(now - 30 * 24 * 60 * 60 * 1000)
    to   = now
  } else if (chartRange === 'custom' && customFrom && customTo) {
    from = new Date(customFrom)
    to   = new Date(customTo)
    to.setHours(23, 59, 59)
  } else {
    return allChartRecords
  }

  return allChartRecords.filter(r => {
    const t = new Date(r.timestamp)
    return t >= from && t <= to
  })
}, [allChartRecords, chartRange, customFrom, customTo])

// const chartData = useMemo(() => {
//   const byTopic = {}
//   Object.keys(topicLabels).forEach(t => (byTopic[t] = []))
//   filteredChartRecords.forEach(r => {
//     if (byTopic[r.topic] !== undefined) {
//       byTopic[r.topic].push({
//         time:  r.timestamp,
//         label: new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false }),
//         value: parseFloat(r.value),
//       })
//     }
//   })
//   Object.keys(byTopic).forEach(t => {
//     byTopic[t].sort((a, b) => new Date(a.time) - new Date(b.time))
//   })
//   return byTopic
// }, [filteredChartRecords])
const chartData = useMemo(() => {
  const byTopic = {}
  Object.keys(topicLabels).forEach(t => (byTopic[t] = []))
  filteredChartRecords.forEach(r => {
    if (byTopic[r.topic] !== undefined) {
      byTopic[r.topic].push({
        time:  r.timestamp,
        // Show date+time for multi-day ranges, time-only for today
        label: chartRange === 'today'
          ? new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false })
          : new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            + ' ' + new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(r.value),
      })
    }
  })
  Object.keys(byTopic).forEach(t => {
    byTopic[t].sort((a, b) => new Date(a.time) - new Date(b.time))
  })
  return byTopic
}, [filteredChartRecords, chartRange])

// Sort table newest → oldest
const sortedRecords = [...latestRecords].sort(
  (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
)
  const fetchCurrentData = async () => {
    try {
      const response = await fetch(`${API}/api/current`)
      const result = await response.json()
      if (result.success) {
        setCurrentData(result.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching current data:', error)
    }
  }

  const fetchLatestRecords = async () => {
    try {
      const response = await fetch(`${API}/api/latest?limit=10`)
      const result = await response.json()
      if (result.success) {
        setLatestRecords(result.data)
      }
    } catch (error) {
      console.error('Error fetching latest records:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API}/api/stats`)
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setLoading(false)
    }
  }


// const fetchChartData = async () => {
//   setChartLoading(true)
//   try {
//     const response = await fetch(`${API}/api/all`)
//     const result = await response.json()
//     if (result.success) {
//       setAllChartRecords(result.data)
//     }
//   } catch (error) {
//     console.error('Error fetching chart data:', error)
//   } finally {
//     setChartLoading(false)
//   }
// }


const fetchChartData = async (range, from, to) => {
  setChartLoading(true)
  try {
    let url = `${API}/api/all`
    const params = new URLSearchParams()

    if (range === 'today') {
      const now = new Date()
      params.set('from', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
      params.set('to',   new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString())
    } else if (range === '7days') {
      params.set('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    } else if (range === '30days') {
      params.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    } else if (range === 'custom' && from && to) {
      params.set('from', new Date(from).toISOString())
      params.set('to',   new Date(to + ':59').toISOString())
    }

    if ([...params].length) url += '?' + params.toString()
    const response = await fetch(url)
    const result = await response.json()
    if (result.success) setAllChartRecords(result.data)
  } catch (error) {
    console.error('Error fetching chart data:', error)
  } finally {
    setChartLoading(false)
  }
}
















  const exportToExcel = async () => {
    const password = prompt("🔐 Enter password to export:")
    if (password !== "BCSIRRUET1826") {
      alert("❌ Wrong password!")
      return
    }
    try {
      setExportLoading(true)
      const response = await fetch(`${API}/api/all`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        const groups = {}

        result.data.forEach(record => {
          const ts = new Date(record.timestamp)
          const rounded = new Date(Math.round(ts.getTime() / 5000) * 5000)
          const key = rounded.toISOString()

          if (!groups[key]) {
            groups[key] = { _timestamp: rounded }
          }
          const shortTopic = record.topic.replace('BCSIR', '')
          if (!groups[key][shortTopic]) {
            groups[key][shortTopic] = record.value
          }
        })

        const excelData = Object.values(groups)
          .sort((a, b) => b._timestamp - a._timestamp)
          .map(group => ({
            'Timestamp':          group._timestamp.toLocaleString('en-US'),
            'Bus Voltage (V)':    group['bus']     || '',
            'Shunt Voltage (mV)': group['shunt']   || '',
            'Load (Ω)':           group['load']    || '',
            'Current (A)':        group['current'] || '',
            'Power (W)':          group['power']   || '',
          }))

        const ws = XLSX.utils.json_to_sheet(excelData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sensor Data')

        ws['!cols'] = [
          { wch: 25 },
          { wch: 18 },
          { wch: 20 },
          { wch: 12 },
          { wch: 14 },
          { wch: 12 },
        ]

        const filename = `BCSIR_Sensor_Data_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, filename)
        console.log(`✅ Exported ${excelData.length} rows to ${filename}`)
      } else {
        alert('No data available to export')
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export data')
    } finally {
      setExportLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentData()
    fetchLatestRecords()
    fetchStats()
    // fetchChartData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentData()
      fetchLatestRecords()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

useEffect(() => {
  fetchChartData(chartRange, customFrom, customTo)
}, [chartRange, customFrom, customTo])

  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⚡IERD Microbial Fuell Cell Dashboard</h1>
              <h3 className="text-3xl font-bold text-gray-400">Institute of Energy Research and Development, BCSIR</h3>
              <p className="text-sm text-gray-500 mt-1">
                🕒 Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
                &nbsp;·&nbsp; 🔄 Auto-refresh every 10s
              </p>
            </div>
            <button
              onClick={exportToExcel}
              disabled={exportLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exportLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to Excel
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</p>
              </div>
            </div>

            {/* <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Topics</p>
                <p className="text-2xl font-bold text-gray-900">{stats.topics.length}</p>
              </div>
            </div> */}

            {/* <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">To Get All</p>
                <p className="text-sm font-semibold text-gray-700 break-all">click Export to Excel</p>
              </div>
            </div> */}
          </div>
        )}

        {/* Current Sensor Values */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">⚡ Current Sensor Values</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(topicLabels).map(([topic, label]) => (
                <div
                  key={topic}
                  className={`bg-gradient-to-br ${topicColors[topic]} rounded-lg p-4 border`}
                >
                  <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
                  <p className="text-3xl font-bold">
                    {currentData[topic]?.value || '--'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{topicUnits[topic]}</p>
                  {currentData[topic]?.timestamp && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(currentData[topic].timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>




{/* Charts Section */}
{/* <div className="bg-white rounded-lg shadow mb-8">
  <div className="px-6 py-4 border-b border-gray-200">
    <h2 className="text-xl font-semibold text-gray-900">📈 Sensor Trends</h2>
    <p className="text-xs text-gray-400 mt-1">Click a sensor to toggle its graph · sorted by time</p>
  </div> */}

  {/* Toggle Buttons */}
  {/* <div className="px-6 pt-4 flex flex-wrap gap-2">
    {Object.entries(topicLabels).map(([topic, label]) => {
      const btnColors = {
        'BCSIRbus':     'bg-blue-600 text-white',
        'BCSIRshunt':   'bg-purple-600 text-white',
        'BCSIRload':    'bg-orange-500 text-white',
        'BCSIRcurrent': 'bg-green-600 text-white',
        'BCSIRpower':   'bg-red-600 text-white',
      }
      const isActive = activeTopics.includes(topic)
      return (
        <button
          key={topic}
          onClick={() => toggleTopic(topic)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
            isActive
              ? btnColors[topic] + ' border-transparent shadow'
              : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
          }`}
        >
          {label}
        </button>
      )
    })}
  </div> */}

  {/* Graphs */}
  {/* <div className="p-6">
    {activeTopics.length === 0 ? (
      <p className="text-center text-gray-400 text-sm py-8">👆 Click a sensor above to see its graph</p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {activeTopics.map(topic => (
          <SensorChart key={topic} topic={topic} data={chartData[topic]} />
        ))}
      </div>
    )}
  </div>
</div> */}






























{/* Charts Section */}
<div className="bg-white rounded-lg shadow mb-8">
  <div className="px-6 py-4 border-b border-gray-200">
    <h2 className="text-xl font-semibold text-gray-900">📈 Sensor Trends</h2>
    <p className="text-xs text-gray-400 mt-1">Click a sensor to toggle · data sorted by time</p>
  </div>

  {/* Date Range Controls */}
  <div className="px-6 pt-4 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
    {[
      { key: 'today',   label: 'Today' },
      { key: '7days',   label: 'Last 7 Days' },
      { key: '30days',  label: 'Last 30 Days' },
      { key: 'custom',  label: 'Custom' },
    ].map(opt => (
      <button
        key={opt.key}
        onClick={() => setChartRange(opt.key)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
          chartRange === opt.key
            ? 'bg-gray-800 text-white border-transparent'
            : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
        }`}
      >
        {opt.label}
      </button>
    ))}

    {chartRange === 'custom' && (
      <div className="flex items-center gap-2 mt-1 sm:mt-0">
        <input
          type="datetime-local"
          value={customFrom}
          onChange={e => setCustomFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="datetime-local"
          value={customTo}
          onChange={e => setCustomTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    )}

    {chartLoading && (
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 ml-2"></div>
    )}
    <span className="text-xs text-gray-400 ml-auto">
      {filteredChartRecords.length} records in range
    </span>
  </div>

  {/* Toggle Buttons */}
  <div className="px-6 pt-4 flex flex-wrap gap-2">
    {Object.entries(topicLabels).map(([topic, label]) => {
      const btnColors = {
        'BCSIRbus':     'bg-blue-600 text-white',
        'BCSIRshunt':   'bg-purple-600 text-white',
        'BCSIRload':    'bg-orange-500 text-white',
        'BCSIRcurrent': 'bg-green-600 text-white',
        'BCSIRpower':   'bg-red-600 text-white',
      }
      const isActive = activeTopics.includes(topic)
      return (
        <button
          key={topic}
          onClick={() => toggleTopic(topic)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
            isActive
              ? btnColors[topic] + ' border-transparent shadow'
              : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
          }`}
        >
          {label}
        </button>
      )
    })}
  </div>

  {/* Graphs */}
  <div className="p-6">
    {activeTopics.length === 0 ? (
      <p className="text-center text-gray-400 text-sm py-8">👆 Click a sensor above to see its graph</p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {activeTopics.map(topic => (
          <SensorChart key={topic} topic={topic} data={chartData[topic]} />
        ))}
      </div>
    )}
  </div>
</div>










        {/* Latest Records Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">🕒 Latest 10 Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRecords.map((record, index) => (
                  <tr key={record._id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {topicLabels[record.topic] || record.topic}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                      {record.value}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.timestamp).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-gray-400 text-sm">
            IERD,BCSIR © 2026 · Bangladesh
          </p>
        </div>
      </footer>

    </div>
  )
}

export default App