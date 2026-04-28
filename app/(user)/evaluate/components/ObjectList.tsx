// app/(user)/evaluate/components/ObjectList.tsx
'use client'

type ObjectData = {
  id: string
  name: string
  type: string
  picName: string
  hasSubmitted: boolean
}

interface ObjectListProps {
  objects: ObjectData[]
  onSelectObject: (objectId: string) => void
  periodOpen: boolean
}

const typeLabels: Record<string, string> = {
  mess: '🏢 Mess',
  office: '🏗️ Kantor',
  vehicle: '🚗 Kendaraan',
  meeting_room: '📋 Ruang Rapat',
}

export default function ObjectList({
  objects,
  onSelectObject,
  periodOpen,
}: ObjectListProps) {
  if (objects.length === 0) {
    return (
      <div className="bg-[#161b27] border border-white/[0.08] rounded-xl p-8 text-center">
        <p className="text-white/60">Tidak ada objek yang tersedia untuk dievaluasi</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {objects.map(obj => (
        <div
          key={obj.id}
          className="bg-[#161b27] border border-white/[0.08] rounded-xl p-6 hover:border-white/[0.16] transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{typeLabels[obj.type] || obj.type}</span>
                {obj.hasSubmitted && (
                  <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                    ✓ Sudah Dinilai
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-1">{obj.name}</h3>
              <p className="text-white/50 text-sm">PIC GA: {obj.picName}</p>
            </div>

            <button
              onClick={() => onSelectObject(obj.id)}
              disabled={!periodOpen && !obj.hasSubmitted}
              className={`ml-4 px-4 py-2 rounded-lg font-medium transition-all ${
                periodOpen
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              {obj.hasSubmitted ? 'Lihat' : 'Nilai'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
