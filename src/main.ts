import './assets/icons/icons.css'
import './style.css'
import './dialog.css'
import L, { LeafletMouseEvent } from 'leaflet'
import {
  GraphComponent,
  GraphViewerInputMode,
  ICommand,
  ScrollBarVisibility,
  License,
  GraphBuilder,
  ShapeNodeStyle,
  PolylineEdgeStyle,
} from 'yfiles'
import './lib/yFilesLicense'


async function run() {
  initializeMap()
  initializeToolbar()
  initializeSidebar()
  initializeGraphComponent()
}

function initializeMap() {
  const mapContainer = document.getElementById('map')
  if (!mapContainer) {
    throw new Error('Map container not found')
  }

  const map = L.map(mapContainer).setView([51.505, -0.09], 2)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  setMapInstance(map)
}

function initializeToolbar() {
  const map = getMapInstance()

  document.getElementById('btn-increase-zoom')!.addEventListener('click', () => {
    map.setZoom(map.getZoom() + 1)
  })

  document.getElementById('btn-decrease-zoom')!.addEventListener('click', () => {
    map.setZoom(map.getZoom() - 1)
  })

  document.getElementById('btn-fit-graph')!.addEventListener('click', () => {
    const bounds = new L.LatLngBounds([])
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        bounds.extend(layer.getLatLng())
      }
    })
    if (bounds.isValid()) {
      map.fitBounds(bounds)
    }
  })
}

function initializeSidebar() {
  const openSidebarButton = document.getElementById('btn-open-sidebar')
  const closeSidebarButton = document.getElementById('btn-close-sidebar')
  const sidebar = document.getElementById('sidebar')
  const submitJsonButton = document.getElementById('btn-submit-json')

  if (!openSidebarButton || !closeSidebarButton || !sidebar || !submitJsonButton) {
    throw new Error('Sidebar elements not found')
  }

  openSidebarButton.addEventListener('click', () => {
    sidebar.classList.remove('collapsed')
  })

  closeSidebarButton.addEventListener('click', () => {
    sidebar.classList.add('collapsed')
  })

  submitJsonButton.addEventListener('click', () => {
    const jsonInput = (document.getElementById('json-input') as HTMLTextAreaElement).value
    try {
      const data = JSON.parse(jsonInput)
      updateMap(data)
    } catch (e) {
      alert('Invalid JSON')
    }
  })
}

function updateMap(data: { nodes: { id: string, country: string }[], edges: { source: string, target: string }[] }) {
  const map = getMapInstance()

  // Clear existing markers and lines
  map.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Polyline) {
      map.removeLayer(layer)
    }
  })

  // Add new markers and lines
  const markers: { [key: string]: L.Marker } = {}
  const bounds = new L.LatLngBounds([])

  data.nodes.forEach(node => {
    fetch(`https://nominatim.openstreetmap.org/search?country=${node.country}&format=json`)
      .then(response => response.json())
      .then(locations => {
        if (locations.length > 0) {
          const location = locations[0]
          const latLng = [location.lat, location.lon] as [number, number]

          const markerInstance = L.marker(latLng).addTo(map).bindPopup(`<b>${node.country}</b><br>ID: ${node.id}`)
          markerInstance.on('contextmenu', (ev: LeafletMouseEvent) => {
            ev.originalEvent.preventDefault()
            showContextMenu(ev, node, data)
          })

          if (!markers[node.country]) {
            markers[node.country] = markerInstance
          } else {
            const currentPopup = markers[node.country].getPopup()?.getContent() ?? ''
            markers[node.country].setPopupContent(`${currentPopup}<br>ID: ${node.id}`)
          }

          bounds.extend(latLng)
        }
      })
  })

  data.edges.forEach(edge => {
    const sourceNode = data.nodes.find(node => node.id === edge.source)
    const targetNode = data.nodes.find(node => node.id === edge.target)

    if (sourceNode && targetNode) {
      fetch(`https://nominatim.openstreetmap.org/search?country=${sourceNode.country}&format=json`)
        .then(response => response.json())
        .then(sourceLocations => {
          if (sourceLocations.length > 0) {
            const sourceLocation = sourceLocations[0]
            fetch(`https://nominatim.openstreetmap.org/search?country=${targetNode.country}&format=json`)
              .then(response => response.json())
              .then(targetLocations => {
                if (targetLocations.length > 0) {
                  const targetLocation = targetLocations[0]
                  L.polyline([
                    [sourceLocation.lat, sourceLocation.lon],
                    [targetLocation.lat, targetLocation.lon]
                  ], { color: 'red' }).addTo(map)

                  bounds.extend([sourceLocation.lat, sourceLocation.lon])
                  bounds.extend([targetLocation.lat, targetLocation.lon])
                }
              })
          }
        })
    }
  })

  if (bounds.isValid()) {
    map.fitBounds(bounds)
  }
}

function showContextMenu(event: LeafletMouseEvent, node: { id: string, country: string }, data: { nodes: { id: string, country: string }[], edges: { source: string, target: string }[] }) {
  const contextMenu = document.createElement('div')
  contextMenu.className = 'context-menu'
  contextMenu.style.position = 'absolute'
  contextMenu.style.left = `${event.originalEvent.pageX}px`
  contextMenu.style.top = `${event.originalEvent.pageY}px`
  contextMenu.style.backgroundColor = 'white'
  contextMenu.style.border = '1px solid #ccc'
  contextMenu.style.padding = '10px'
  contextMenu.style.zIndex = '1000'

  const nodeList = data.nodes.filter(n => n.country === node.country)

  nodeList.forEach(n => {
    const option = document.createElement('div')
    option.textContent = `ID: ${n.id}`
    option.style.cursor = 'pointer'
    option.addEventListener('click', () => {
      showDetailedView(data, n.id)
      document.body.removeChild(contextMenu)
    })
    contextMenu.appendChild(option)
  })

  document.body.appendChild(contextMenu)

  document.addEventListener('click', () => {
    if (document.body.contains(contextMenu)) {
      document.body.removeChild(contextMenu)
    }
  }, { once: true })
}

function showDetailedView(data: { nodes: { id: string, country: string }[], edges: { source: string, target: string }[] }, selectedId: string) {
  const graphComponent = getGraphComponentInstance()
  const graph = graphComponent.graph
  if (!graph) {
    throw new Error('Graph not initialized')
  }

  graph.clear() // Clear previous graph data
  const builder = new GraphBuilder(graph)

  const nodeData = data.nodes.filter(n => data.edges.some(e => e.source === n.id || e.target === n.id))

  builder.createNodesSource({
    data: nodeData,
    id: 'id',
    layout: node => ({ x: Math.random() * 500, y: Math.random() * 500, width: 30, height: 30 }),
    style: node => new ShapeNodeStyle({ fill: getColorByCountry(node.country), shape: 'ellipse' })
  })

  builder.createEdgesSource(data.edges.filter(edge => nodeData.some(n => n.id === edge.source || n.id === edge.target)), 'source', 'target', edge => ({
    style: new PolylineEdgeStyle({
      stroke: '2px solid black',
      targetArrow: 'default'
    })
  }))

  builder.buildGraph()

  graphComponent.fitGraphBounds()

  document.getElementById('graphComponent')!.style.display = 'block'
  document.getElementById('map')!.style.display = 'none'
  document.getElementById('legend')!.style.display = 'block'
  document.getElementById('backButton')!.style.display = 'block'
}

function initializeGraphComponent(): GraphComponent {
  const container = document.getElementById('graphComponent') as HTMLDivElement
  if (!container) {
    throw new Error('Graph component container not found')
  }
  const graphComponent = new GraphComponent(container)
  graphComponent.inputMode = new GraphViewerInputMode()
  graphComponent.horizontalScrollBarPolicy = ScrollBarVisibility.NEVER
  graphComponent.verticalScrollBarPolicy = ScrollBarVisibility.NEVER
  setGraphComponentInstance(graphComponent)
  return graphComponent
}

function getColorByCountry(country: string): string {
  const colors: { [key: string]: string } = {
    Germany: '#ff0000',
    France: '#0000ff',
    // Add more countries and their colors here
  }
  return colors[country] || '#00ff00'
}

function setGraphComponentInstance(graphComponent: GraphComponent) {
  ;(window as any).graphComponent = graphComponent
}

function getGraphComponentInstance(): GraphComponent {
  const graphComponent = (window as any).graphComponent
  if (!graphComponent) {
    return initializeGraphComponent()
  }
  return graphComponent
}

// Utility to store and retrieve the map instance
let mapInstance: L.Map | null = null

function setMapInstance(map: L.Map) {
  mapInstance = map
}

function getMapInstance(): L.Map {
  if (!mapInstance) {
    throw new Error('Map instance not initialized')
  }
  return mapInstance
}

// Back to map button
document.getElementById('backButton')!.addEventListener('click', () => {
  document.getElementById('graphComponent')!.style.display = 'none'
  document.getElementById('map')!.style.display = 'block'
  document.getElementById('legend')!.style.display = 'none'
  document.getElementById('backButton')!.style.display = 'none'
})

run()
