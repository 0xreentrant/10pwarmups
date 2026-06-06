# DOT Language Reference

Quick reference for Graphviz DOT syntax.

## Basic Structure

```dot
// Directed graph
digraph {
  node_a -> node_b;
  node_b -> node_c;
}

// Undirected graph
graph {
  node_a -- node_b;
  node_b -- node_c;
}
```

## Nodes

```dot
digraph {
  // Simple node
  A;
  
  // Node with label
  B [label="Node B"];
  
  // Node with custom shape
  C [shape=circle, label="Circle"];
  D [shape=diamond, label="Diamond"];
  E [shape=ellipse, label="Ellipse"];
  F [shape=box, label="Box"];
  
  // Styled nodes
  G [label="Styled", 
     fillcolor="#1a1a1a", 
     fontcolor="#e8e8e8", 
     style=filled];
}
```

## Edges

```dot
digraph {
  // Simple edge
  A -> B;
  
  // Edge with label
  A -> B [label="connection"];
  
  // Styled edge
  A -> B [label="data flow", 
          color="#666", 
          fontcolor="#e8e8e8"];
  
  // Multiple edges from same source
  A -> B;
  A -> C;
  
  // Edge attributes
  A -> B [style=dashed];
  A -> B [style=dotted];
  A -> B [penwidth=2.0];
}
```

## Graph Properties

```dot
digraph MyGraph {
  // Layout direction: TB (top-bottom), LR (left-right), etc.
  rankdir = LR;
  
  // Background color
  bgcolor = "#0f0f0f";
  
  // Margin
  margin = 0.2;
  
  // Separation between ranks
  ranksep = 1.0;
  
  // Separation between nodes
  nodesep = 0.5;
  
  // Default node attributes
  node [shape=box, style=filled, fillcolor="#1a1a1a"];
  
  // Default edge attributes
  edge [color="#666"];
}
```

## Node Shapes

Common shapes: `box`, `circle`, `diamond`, `ellipse`, `plaintext`, `note`, `folder`, `cylinder`, `record`, `Mrecord`

```dot
digraph {
  a [shape=box];
  b [shape=circle];
  c [shape=diamond];
  d [shape=ellipse];
  e [shape=polygon, sides=6];
  f [shape=record, label="{Name|Type}"];
}
```

## Colors

```dot
digraph {
  // X11 color names
  a [fillcolor=red, style=filled];
  b [fillcolor=lightblue, style=filled];
  
  // Hex colors
  c [fillcolor="#c0392b", style=filled, fontcolor="#e8e8e8"];
  
  // RGB
  d [fillcolor="0.5 0.2 0.1", style=filled];
}
```

## Styling

```dot
digraph {
  // Filled background
  a [style=filled, fillcolor="#1a1a1a", fontcolor="#e8e8e8"];
  
  // Dashed/dotted outlines
  b [style=dashed];
  c [style=dotted];
  
  // Line width
  a -> b [penwidth=2.0];
  
  // Edge styles
  b -> c [style=dashed];
  c -> d [style=dotted];
}
```

## Subgraphs (Clustering)

```dot
digraph {
  subgraph cluster_A {
    label = "Cluster A";
    style = filled;
    fillcolor = "#2a3d1a";
    
    A1 -> A2 -> A3;
  }
  
  subgraph cluster_B {
    label = "Cluster B";
    style = filled;
    fillcolor = "#3d1a1a";
    
    B1 -> B2;
  }
  
  A3 -> B1;
}
```

## Comments

```dot
digraph {
  // Single line comment
  A -> B;
  
  /* Multi-line
     comment */
  B -> C;
}
```

## Dark Mode Example

```dot
digraph {
  rankdir = TB;
  bgcolor = "#0f0f0f";
  
  node [shape=box, 
        style="rounded,filled", 
        fillcolor="#1a1a1a", 
        fontcolor="#e8e8e8", 
        color="#2e2e2e",
        fontname="monospace"];
  
  edge [color="#666"];
  
  DataStore [label="Data\nStorage", fillcolor="#2a3d1a"];
  API [label="API\nServer", fillcolor="#3d1a1a"];
  Client [label="Client", fillcolor="#1a2847"];
  
  DataStore -> API;
  API -> Client;
}
```

## Practical Examples

### Architecture Diagram

```dot
digraph Architecture {
  rankdir = TB;
  
  Frontend [label="Frontend\n(React)", shape=box];
  API [label="API Server", shape=box];
  DB [label="Database", shape=cylinder];
  Cache [label="Cache\n(Redis)", shape=box];
  
  Frontend -> API;
  API -> DB;
  API -> Cache;
  Cache -> DB [style=dotted];
}
```

### Flowchart

```dot
digraph Flowchart {
  rankdir = TB;
  
  Start [label="Start", shape=ellipse];
  Decision {label="Choice?", shape=diamond];
  Action1 [label="Action A"];
  Action2 [label="Action B"];
  End [label="End", shape=ellipse];
  
  Start -> Decision;
  Decision -> Action1 [label="Yes"];
  Decision -> Action2 [label="No"];
  Action1 -> End;
  Action2 -> End;
}
```

### State Machine

```dot
digraph StateMachine {
  rankdir = LR;
  
  Idle [label="Idle"];
  Running [label="Running"];
  Paused [label="Paused"];
  
  Idle -> Running [label="start"];
  Running -> Paused [label="pause"];
  Paused -> Running [label="resume"];
  Running -> Idle [label="stop"];
}
```

## Resources

- Official: https://graphviz.org/doc/info/lang.html
- Examples: https://graphviz.org/Gallery/
- Colors: https://graphviz.org/doc/info/colors.html
