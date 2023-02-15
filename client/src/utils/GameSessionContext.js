import React, { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useQuery } from '@apollo/client';
import { QUERY_QUESTIONS } from './queries';

export const GameSessionContext = React.createContext();
export const useGameSession = () => useContext(GameSessionContext);

// Initialize socket.io client
const socket = io();

// Create our game session provider.
export default function GameSessionProvider({ children }) {
  
  // Global variables for the game session
  const { loading: questionsLoading, data: questionsData } = useQuery(QUERY_QUESTIONS);
  const [gameScreen, setGameScreen] = useState('lobby');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [turn, setTurn] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [usedQuestions, setUsedQuestions] = useState([]);

  useEffect(() => {
    socket.on('receive_reset_questions', () => {
      setUsedQuestions([]);
      console.log('resetting questions!');
    });

    socket.on('receive_pick_question', (questionIndex) => {
      setUsedQuestions([...usedQuestions, questionIndex]);
      setCurrentQuestion(questionIndex);
      console.log(`picked question: ${questionIndex}`);
    });

    return () => {
      socket.off('receive_reset_questions');
      socket.off('receive_pick_question');
    };
  }, [usedQuestions]);
  
  // Methods
  const joinRoom = (id) => {
    setRoomId(id);
  }

  const joinRoomAsHost = (id) => {
    setIsHost(true);
    setRoomId(id);
  }

  const leaveRoom = () => {
    socket.emit('leave_room', roomId);
    setRoomId(null);
  }

  const leaveRoomAsHost = () => {
    socket.emit('leave_room',roomId);
    socket.emit('host_left', roomId);
    setRoomId(null);
    setIsHost(false);
  }

  const advanceTurn = () => {
    if (turn >= players.length-1) setTurn(0);
    else setTurn(turn+1);
  }

  const pickQuestion = () => {
    const questions = questionsData?.questions || [];
    if (questions.length > 0) {
      // Reset used question array of all questions have already been used.
      if (usedQuestions.length >= questions.length) {
        socket.emit('reset_questions');
      }
      const questionIndices = [];
      for (let i=0; i<questions.length; i++) questionIndices.push(i);
      const remainingQuestionIndices = questionIndices.filter(i => !usedQuestions.includes(i));
      const pickedQuestion = remainingQuestionIndices[Math.floor(Math.random()*remainingQuestionIndices.length)];
      socket.emit('pick_question', {room: roomId, questionIndex: pickedQuestion});
    } else {
      socket.emit('pick_question', {room: roomId, questionIndex: null});
    }
  }

  // The provider component will wrap all other components inside of it that need access to our global state
  return (
    // Dark theme and toggle theme are getting provided to the child components
    <GameSessionContext.Provider value={{
      socket,
      questionsLoading,
      questionsData,
      gameScreen,
      setGameScreen,
      roomId,
      isHost,
      joinRoom,
      joinRoomAsHost,
      leaveRoom,
      leaveRoomAsHost,
      players,
      setPlayers,
      currentQuestion,
      pickQuestion,
      turn,
      advanceTurn
    }}>
      {children}
    </GameSessionContext.Provider>
  );
}
