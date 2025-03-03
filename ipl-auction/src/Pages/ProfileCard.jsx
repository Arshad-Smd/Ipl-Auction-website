"use client"
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom"
import { useRef, useState, useEffect } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation } from "swiper/modules"
import "swiper/css"
import "swiper/css/navigation"
import "./ProfileCard.css"
import readJson from "./readExcel"



const calculateBasePrice = (points) => {
  if (points == 2) {
    return 0.5
  } else if (points == 3) {
    return 1.0
  } else if (points == 4) {
    return 1.5
  } else {
    return 2.0
  }
}

const renderStars = (rating) => {
  let stars = ""
  for (let i = 0; i < rating; i++) {
    stars += "⭐"
  }
  return stars
}





const transformPlayerData = (players) => {
  if (!Array.isArray(players)) return []

  return players.map((player) => ({
    name: player["Name"] || "Unavailable",
    img: player["image"] ? `/images/${player["image"]}` : "../public/images/unavailable.jpg",
    age: player["Age"] || "N/A",
    specialization: player["Specialization"] || "Unavailable",
    category: player["Category"] || "Unavailable",
    country: player["Country"] || "Unavailable",
    team: player["2024\nTeam"] || "Unavailable",
    basePrice: calculateBasePrice(player["Points"]) || 1.0,
    stats: {
      matches: renderStars(player["Points"]) || "N/A",
      runs: player["Total runs"] || "N/A",
      wickets: player["Total wickets"] || "N/A",
    },
  }))
}

// Utility functions
const formatPrice = (price) => (typeof price === "number" ? price.toFixed(2) : "0.00")
const calculateIncrement = (currentBid) => (currentBid >= 5 ? 0.5 : 0.25)

// Stateless components
const StatItem = ({ label, value }) => (
  <div className="stat-item">
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}</span>
  </div>
)

const SoldOverlay = ({ isVisible, type }) => (
  <div className={`status-overlay ${isVisible ? "show" : ""} ${type}-overlay`}>
    <div className="status-content">
      <h1 className="status-text">{type}</h1>
    </div>
  </div>
)

const Timer = ({ time, isActive, isPaused }) => (
  <div className="timer-container">
    <div className="timer-ring">
      <div
        className={`timer-circle ${isPaused ? "paused" : ""}`}
        style={{
          background: `conic-gradient(#4CAF50 ${(time / 20) * 360}deg, transparent 0deg)`,
        }}
      />
      <span className="timer-text">{isPaused ? "⏸️" : time}</span>
    </div>
  </div>
)

const Card = ({ player, isActive, onTimerEnd, onStatusChange }) => {
  const [currentBid, setCurrentBid] = useState(player.basePrice)
  const [bidHistory, setBidHistory] = useState([player.basePrice])
  const [showStatus, setShowStatus] = useState({ visible: false, type: "" })
  const [timeLeft, setTimeLeft] = useState(15)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const audioContextRef = useRef(null)
  const audioBufferRef = useRef(null)
  const timerIntervalRef = useRef(null)

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
          const response = await fetch("not-sold.m4a")
          const arrayBuffer = await response.arrayBuffer()
          audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer)
        }
      } catch (error) {
        console.error("Audio initialization failed:", error)
      }
    }

    initAudio()

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])


 


  // Handle slide activation/deactivation
  useEffect(() => {
    if (isActive) {
      setTimeLeft(20)
      setIsTimerActive(true)
      setIsPaused(false)
    } else {
      setIsTimerActive(false)
      clearInterval(timerIntervalRef.current)
      setShowStatus({ visible: false, type: "" })
      setIsPaused(false)
    }

    return () => {
      clearInterval(timerIntervalRef.current)
    }
  }, [isActive])

  // Updated timer logic with pause functionality
  useEffect(() => {
    if (isActive && isTimerActive && timeLeft > 0 && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerIntervalRef.current)
            const type = currentBid > player.basePrice ? "sold" : "not-sold"
            playStatusAnimation(type)
            onTimerEnd?.()
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    }

    return () => {
      clearInterval(timerIntervalRef.current)
    }
  }, [isTimerActive, isActive, isPaused, currentBid, player.basePrice])

  const playAudio = () => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume()
    }

    if (audioContextRef.current && audioBufferRef.current) {
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBufferRef.current
      source.connect(audioContextRef.current.destination)
      source.start(0)
    }
  }

  const resetTimer = () => {
    if (isActive) {
      setTimeLeft(20)
      setIsTimerActive(true)
      setIsPaused(false)
    }
  }

  const handleBidClick = () => {
    if (!isActive || !isTimerActive || isPaused) return
    const increment = calculateIncrement(currentBid)
    const newBid = Number.parseFloat((currentBid + increment).toFixed(2))
    setCurrentBid(newBid)
    setBidHistory((prev) => [...prev, newBid])
    resetTimer()
  }

  const handleDecrement = () => {
    if (!isActive || !isTimerActive || isPaused) return
    if (bidHistory.length > 1) {
      const newHistory = bidHistory.slice(0, -1)
      setCurrentBid(newHistory[newHistory.length - 1])
      setBidHistory(newHistory)
      resetTimer()
    }
  }

  const playStatusAnimation = (type) => {
    if (!isActive) return
    setShowStatus({ visible: true, type })
    if (type === "not-sold") {
      playAudio()
      onStatusChange("not-sold")
    } else if (type === "sold") {
      onStatusChange("sold")
    }
    setIsTimerActive(false)
    setIsPaused(false)

    setTimeout(() => {
      if (isActive) {
        setShowStatus({ visible: false, type: "" })
        resetTimer()
      }
    }, 9000)
  }

  // Updated keyboard event handler
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!isActive) return

      switch (event.key) {
        case " ": // Spacebar
          event.preventDefault() // Prevent page scroll
          if (isTimerActive && !showStatus.visible) {
            setIsPaused((prev) => !prev)
          }
          break
        case "+":
          if (!isPaused) handleBidClick()
          break
        case "-":
          if (!isPaused) handleDecrement()
          break
        case "0":
          if (!isPaused) playStatusAnimation("sold")
          break
        default:
          break
      }
    }

    if (isActive) {
      window.addEventListener("keydown", handleKeyPress)
      return () => window.removeEventListener("keydown", handleKeyPress)
    }
  }, [isActive, currentBid, isPaused, isTimerActive, showStatus.visible])

  return (
    <div className="profile-content" id={player.name}>
      <SoldOverlay isVisible={showStatus.visible} type={showStatus.type} />
      <Timer time={timeLeft} isActive={isTimerActive} isPaused={isPaused} />
      <div className="player-image-container">
        <img src={player.img || "/placeholder.svg"} alt={player.name} className="player-image" />
      </div>
      <div className="player-info">
        <div className="player-header">
          <h1 className="player-name">{player.name}</h1>
          <div className="player-tags">
            <span className="tag">{player.age}</span>
            <span className="tag">{player.specialization}</span>
            <span className="tag">{player.country}</span>
            <br />
            <span className="tag">{player.category}</span>
          </div>
          <p className="player-team">{player.team}</p>
        </div>

        <div className="bidding-container">
          <div className="base-price-box">
            <h3 className="bid-title">Base Price</h3>
            <p className="price-value">{formatPrice(player.basePrice)} Cr</p>
          </div>
          <div
            className={`current-bid-box ${isPaused ? "paused" : ""}`}
            onClick={() => !isPaused && handleBidClick()}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && !isPaused && handleBidClick()}
          >
            <h3 className="bid-title">Current Bid</h3>
            <p className="price-value">{formatPrice(currentBid)} Cr</p>
            <p className="bid-instruction">{isPaused ? "Timer Paused" : "Click to increment"}</p>
          </div>
        </div>

        <div className="stats-container">
          <h2 className="stats-title">Career Statistics</h2>
          <StatItem label="Player points" value={player.stats.matches} />
          <StatItem label="Total Runs (IPL)" value={player.stats.runs} />
          <StatItem label="Wickets Taken (IPL)" value={player.stats.wickets} />
        </div>
      </div>
    </div>
  )
}

const ProfileCard = () => {
  const [playerData, setPlayerData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const swiperRef = useRef(null)
  const navigationPrevRef = useRef(null)
  const navigationNextRef = useRef(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const { id } = useParams(); 

  useEffect(() => {
    if (swiperRef.current && id) {
      const playerIndex = parseInt(id) - 1 // Convert to 0-based index
      if (!isNaN(playerIndex) && playerIndex >= 0 && playerIndex < playerData.length) {
        swiperRef.current.slideTo(playerIndex, 500) // 500ms animation
        setActiveSlideIndex(playerIndex)
      }
    }
  }, [id, playerData])

  useEffect(() => {
    // Extract the ID from the URL path
    const getIdFromUrl = () => {
      const pathParts = window.location.pathname.split('/')
      const lastPart = pathParts[pathParts.length - 1]
      return !isNaN(parseInt(lastPart)) ? parseInt(lastPart) : null
    }
    
    const id = getIdFromUrl()
    
    // Navigate to the correct slide when data is loaded and swiper is ready
    if (swiperRef.current && id && playerData.length > 0) {
      const playerIndex = id - 1 // Convert to 0-based index
      if (!isNaN(playerIndex) && playerIndex >= 0 && playerIndex < playerData.length) {
        // Navigate to the slide with a slight delay to ensure swiper is initialized
        setTimeout(() => {
          swiperRef.current.slideTo(playerIndex)
          setActiveSlideIndex(playerIndex)
        }, 100)
      }
    }
  }, [playerData])


  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const data = await readJson()
        if (data && data["Sheet1"]) {
          const transformedData = transformPlayerData(data["Sheet1"])
          setPlayerData(transformedData)
        }
      } catch (error) {
        console.error("Error loading player data:", error)
        setPlayerData([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])





  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "ArrowLeft") {
        swiperRef.current?.slidePrev()
      } else if (event.key === "ArrowRight") {
        swiperRef.current?.slideNext()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="profile-card">
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper
            swiper.params.navigation.prevEl = navigationPrevRef.current
            swiper.params.navigation.nextEl = navigationNextRef.current
            swiper.navigation.destroy()
            swiper.navigation.init()
            swiper.navigation.update()
          }}
          modules={[Navigation]}
          navigation={{
            prevEl: navigationPrevRef.current,
            nextEl: navigationNextRef.current,
          }}
          loop={false}
          slidesPerView={1}
          slidesPerGroup={1}
          className="mySwiper"
          onSlideChange={(swiper) => {
            setActiveSlideIndex(swiper.realIndex)
          }}
        >
          {playerData.length > 0 ? (
            playerData.map((player, index) => (
              <SwiperSlide key={index}>
                <Card
                  player={player}
                  isActive={activeSlideIndex === index}
                  onTimerEnd={() => {}}
                  onStatusChange={() => {}}
                />
              </SwiperSlide>
            ))
          ) : (
            <SwiperSlide>
              <div className="no-data-message">
                <h2>No player data available</h2>
              </div>
            </SwiperSlide>
          )}
        </Swiper>
      </div>
    </div>
  )
}
export default ProfileCard

