# Diagram Generator Skill

A pi skill for generating and visualizing Graphviz DOT diagrams with automatic GUI viewing.

## Structure

```
diagram-generator/
├── SKILL.md                    # Skill definition and usage guide
├── README.md                   # This file
├── scripts/
│   └── generate-diagram.sh     # Main script (executable)
└── references/
    └── dot-reference.md        # DOT language reference
```

## Quick Start

```bash
# Create a diagram file
cat > example.dot << 'EOF'
digraph {
  A -> B;
  B -> C;
}
EOF

# Render and view
.pi/skills/diagram-generator/scripts/generate-diagram.sh example.dot
```

## Features

- ✅ Render DOT files to PNG, SVG, PDF
- ✅ Automatic GUI viewing with configurable viewers
- ✅ Error handling and validation
- ✅ Multiple format support (render "all" at once)
- ✅ Dark mode friendly examples

## See Also

- Load full skill: `/skill:diagram-generator`
- Load with args: `/skill:diagram-generator mydiagram.dot svg`
