---
title: Create Your First File
description: Build a complete TS Markdown application from scratch
date: 2024-01-15
author: TS Markdown Team
tags: [tutorial, first-file, complete-example]
---

## Project Structure

First, let's set up our project structure:

```
my-dashboard/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── UserCard.tsx
│   │   └── TodoList.tsx
│   ├── templates/
│   │   └── dashboard.tsm
│   ├── data/
│   │   └── sample-data.ts
│   └── index.tsx
├── index.html
├── package.json
└── tsconfig.json
```

## Step 1: Project Setup

Create your project:

```bash
mkdir my-dashboard
cd my-dashboard
bun init -y
bun add tsm react react-dom
bun add -D @types/react @types/react-dom typescript
```

## Step 2: Create Sample Data

Create `src/data/sample-data.ts`:

```typescript
export interface User {
  id: string
  name: string
  email: string
  avatar: string
  isOnline: boolean
  lastSeen: string
  preferences: {
    theme: 'light' | 'dark'
    language: string
    notifications: boolean
  }
}

export interface Todo {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
}

export interface DashboardData {
  user: User
  todos: Todo[]
  stats: {
    completedTodos: number
    totalTodos: number
    completionRate: number
  }
  weather: {
    temperature: number
    condition: string
    location: string
  }
}

export const sampleData: DashboardData = {
  user: {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: true
    }
  },
  todos: [
    {
      id: '1',
      text: 'Learn TS Markdown',
      completed: true,
      priority: 'high',
      dueDate: '2024-01-20'
    },
    {
      id: '2',
      text: 'Build a dashboard',
      completed: false,
      priority: 'medium',
      dueDate: '2024-01-25'
    },
    {
      id: '3',
      text: 'Write documentation',
      completed: false,
      priority: 'low'
    }
  ],
  stats: {
    completedTodos: 1,
    totalTodos: 3,
    completionRate: 33.3
  },
  weather: {
    temperature: 22,
    condition: 'Sunny',
    location: 'San Francisco'
  }
}
```

## Step 3: Create React Components

Create `src/components/UserCard.tsx`:

```typescript
import React from 'react'

interface UserCardProps {
  user: {
    name: string
    email: string
    avatar: string
    isOnline: boolean
  }
}

export const UserCard: React.FC<UserCardProps> = ({ user }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      <img
        src={user.avatar}
        alt={user.name}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          marginRight: '12px'
        }}
      />
      <div>
        <h3 style={{ margin: '0 0 4px 0' }}>{user.name}</h3>
        <p style={{ margin: '0 0 4px 0', color: '#666' }}>{user.email}</p>
        <span style={{
          color: user.isOnline ? '#4CAF50' : '#999',
          fontSize: '14px'
        }}>
          {user.isOnline ? '🟢 Online' : '🔴 Offline'}
        </span>
      </div>
    </div>
  )
}
```

Create `src/components/TodoList.tsx`:

```typescript
import React from 'react'

interface Todo {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
}

interface TodoListProps {
  todos: Todo[]
  onToggleTodo: (id: string) => void
}

export const TodoList: React.FC<TodoListProps> = ({ todos, onToggleTodo }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4444'
      case 'medium': return '#ffaa00'
      case 'low': return '#44ff44'
      default: return '#666'
    }
  }

  return (
    <div>
      <h3>Your Todos</h3>
      {todos.map(todo => (
        <div
          key={todo.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '8px',
            backgroundColor: todo.completed ? '#f0f8f0' : '#fff'
          }}
        >
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggleTodo(todo.id)}
            style={{ marginRight: '12px' }}
          />
          <div style={{ flex: 1 }}>
            <span style={{
              textDecoration: todo.completed ? 'line-through' : 'none',
              color: todo.completed ? '#666' : '#000'
            }}>
              {todo.text}
            </span>
            {todo.dueDate && (
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                Due: {todo.dueDate}
              </span>
            )}
          </div>
          <span style={{
            color: getPriorityColor(todo.priority),
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {todo.priority.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  )
}
```

## Step 4: Create the Dashboard Template

Create `src/templates/dashboard.tsm`:

```tsm
---
title: Personal Dashboard
description: A dynamic dashboard built with TS Markdown
---

# Welcome back, {user.name}! 👋

## Today's Overview

<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
  marginBottom: '20px'
}}>
  
  <!-- Weather Card -->
  <div style={{
    padding: '16px',
    backgroundColor: '#e3f2fd',
    borderRadius: '8px',
    border: '1px solid #bbdefb'
  }}>
    <h3>🌤️ Weather</h3>
    <p><strong>{weather.location}</strong></p>
    <p>{weather.temperature}°C - {weather.condition}</p>
  </div>

  <!-- Stats Card -->
  <div style={{
    padding: '16px',
    backgroundColor: '#f3e5f5',
    borderRadius: '8px',
    border: '1px solid #ce93d8'
  }}>
    <h3>📊 Progress</h3>
    <p>{stats.completedTodos} of {stats.totalTodos} todos completed</p>
    <p>Completion rate: {stats.completionRate}%</p>
  </div>
</div>

## Your Profile

<UserCard user={user} />

## Quick Actions

<div style={{
  display: 'flex',
  gap: '12px',
  marginBottom: '20px'
}}>
  <button 
    onClick={() => alert('Hello {user.name}!')}
    style={{
      padding: '8px 16px',
      backgroundColor: '#2196F3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    Say Hello
  </button>
  
  <button 
    onClick={() => console.log('Theme toggled!')}
    style={{
      padding: '8px 16px',
      backgroundColor: user.preferences.theme === 'dark' ? '#FFC107' : '#424242',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    Toggle Theme
  </button>
</div>

## Your Todos

<TodoList 
  todos={todos} 
  onToggleTodo={(id) => {
    console.log('Toggle todo:', id);
    // In a real app, this would update the data
  }}
/>

## Recent Activity

{user.isOnline ? (
  <div style={{
    padding: '16px',
    backgroundColor: '#e8f5e8',
    borderRadius: '8px',
    border: '1px solid #4caf50'
  }}>
    <p>✅ You're currently online and active</p>
    <p>Last seen: {new Date(user.lastSeen).toLocaleString()}</p>
  </div>
) : (
  <div style={{
    padding: '16px',
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    border: '1px solid #ff9800'
  }}>
    <p>⏰ You were last online at {new Date(user.lastSeen).toLocaleString()}</p>
  </div>
)}

## Settings

<div style={{
  padding: '16px',
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  marginTop: '20px'
}}>
  <h3>Preferences</h3>
  <ul>
    <li>Theme: {user.preferences.theme}</li>
    <li>Language: {user.preferences.language}</li>
    <li>Notifications: {user.preferences.notifications ? 'Enabled' : 'Disabled'}</li>
  </ul>
</div>
```

## Step 5: Create the Main Application

Create `src/index.tsx`:

```typescript
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TSMParser, compileTSM, executeTSMTemplate } from 'tsm'
import { sampleData, DashboardData } from './data/sample-data'
import { UserCard } from './components/UserCard'
import { TodoList } from './components/TodoList'
import dashboardTemplate from './templates/dashboard.tsm?raw'

function App() {
  const [data, setData] = useState<DashboardData>(sampleData)

  // Parse and compile the template
  const parser = new TSMParser()
  const parsed = parser.parse(dashboardTemplate)
  const compiled = compileTSM(parsed)

  const handleToggleTodo = (id: string) => {
    setData(prevData => ({
      ...prevData,
      todos: prevData.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
      stats: {
        ...prevData.stats,
        completedTodos: prevData.todos.filter(t => t.id === id ? !t.completed : t.completed).length,
        completionRate: (prevData.todos.filter(t => t.id === id ? !t.completed : t.completed).length / prevData.todos.length) * 100
      }
    }))
  }

  // Execute the template with data and components
  const result = executeTSMTemplate(compiled, {
    ...data,
    onToggleTodo: handleToggleTodo
  }, {
    UserCard,
    TodoList
  })

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {result}
    </div>
  )
}

// Render the app
const container = document.getElementById('root')
const root = createRoot(container!)
root.render(<App />)
```

## Step 6: Create HTML Template

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TS Markdown Dashboard</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./src/index.tsx"></script>
</body>
</html>
```

## Step 7: Run Your Application

```bash
bun run --bun src/index.tsx
```

🎉 **Congratulations!** You've built a complete TS Markdown application!

## What You've Built

Your dashboard includes:

✅ **Dynamic Content**: User name, weather, and stats update based on data  
✅ **Interactive Components**: Clickable buttons and todo checkboxes  
✅ **Conditional Rendering**: Different content based on user status  
✅ **Real-time Updates**: Todo completion updates the stats  
✅ **Component Integration**: Custom React components in TS Markdown  
✅ **Responsive Design**: Clean, modern interface  

## Key Features Demonstrated

### 1. **Template Interpolation**
```jsx
Welcome back, {user.name}! 👋
```

### 2. **Conditional Rendering**
```jsx
{user.isOnline ? (
  <div>Online status</div>
) : (
  <div>Offline status</div>
)}
```

### 3. **Component Integration**
```jsx
<UserCard user={user} />
<TodoList todos={todos} onToggleTodo={handleToggleTodo} />
```

### 4. **Interactive Elements**
```jsx
<button onClick={() => alert('Hello {user.name}!')}>
  Say Hello
</button>
```

### 5. **Dynamic Styling**
```jsx
backgroundColor: user.preferences.theme === 'dark' ? '#424242' : '#fff'
```

## Next Steps

Now that you have a working application, try these enhancements:

1. **Add More Components**: Create charts, calendars, or forms
2. **Data Persistence**: Save todos to localStorage or an API
3. **Real-time Updates**: Add WebSocket integration
4. **Theming**: Implement a full theme system
5. **Responsive Design**: Make it work on mobile devices

## Advanced Patterns

### Data Fetching
```typescript
const fetchData = async () => {
  const response = await fetch('/api/dashboard')
  return response.json()
}
```

### Error Boundaries
```typescript
const ErrorBoundary = ({ children }) => {
  // Error handling logic
}
```

### Performance Optimization
```typescript
const MemoizedComponent = React.memo(MyComponent)
```

{% callout type="check" %}
**Complete Application Built!** You now have a fully functional TS Markdown dashboard with dynamic content, interactivity, and real-time updates.
{% /callout %}

Ready to explore more features? Check out the [Syntax Guide](/syntax-guide) to learn about advanced TS Markdown capabilities!
