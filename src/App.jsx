import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

const API = "https://bcsir-server-power.onrender.com"

function App() {
  const [currentData, setCurrentData] = useState({})
  const [latestRecords, setLatestRecords] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)

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
      const response = await fetch(`${API}/api/latest?limit=50`)
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
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentData()
      fetchLatestRecords()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

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

        {/* Latest Records Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">🕒 Latest 50 Records</h2>
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
                {latestRecords.map((record, index) => (
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
