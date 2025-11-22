# CritteRL - Creature Evolution with Reinforcement Learning

## Overview

CritteRL is a sandbox simulation game inspired by **Evolution** by Keiwan Donyagard. Players design creatures using joints, bones, and muscles, and watch them learn to perform various tasks through **Reinforcement Learning (RL)** instead of genetic algorithms.

## Core Concept

In the original Evolution game, creatures learn through a combination of neural networks and genetic algorithms - populations evolve over generations, with successful creatures passing on their traits. CritteRL takes a different approach by using **Reinforcement Learning**, where individual creatures learn through trial and error, receiving rewards for successful behaviors and adjusting their neural network policies accordingly.

## Key Features

### Creature Design
- **Modular Construction**: Design creatures using joints, bones, and muscles
- **Physics-Based Simulation**: Realistic physics engine for movement and interaction
- **Visual Editor**: Intuitive interface for building and modifying creatures

### Learning System
- **Reinforcement Learning**: Creatures learn through RL PPO
- **Neural Network Control**: Each creature's behavior is controlled by a neural network
- **Reward-Based Learning**: Creatures receive rewards for achieving goals (running, jumping, climbing, flying, etc.)
- **Real-Time Training**: Watch creatures improve their performance in real-time

### Tasks & Challenges
- **Locomotion**: Running, walking, crawling
- **Jumping**: Various heights and distances
- **Climbing**: Navigating obstacles and terrain
- **Flying**: For creatures with wings or gliding capabilities

## Technical Approach

- **Physics Engine**: Realistic simulation of joints, forces, and collisions
- **RL Framework**: Integration with modern RL libraries (e.g., Stable-Baselines3, Ray RLlib)
- **Neural Networks**: Deep learning models for policy and value functions
- **Environment**: Custom gymnasium-compatible environment for RL training
- **Visualization**: Real-time rendering of creatures and their learning progress

## Goals

1. Create an engaging sandbox where players can experiment with creature design
2. Demonstrate RL capabilities in a fun, interactive way
3. Allow players to watch creatures learn and adapt in real-time
