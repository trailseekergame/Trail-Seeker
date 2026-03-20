import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ZoneNode } from '../../types';
import { useGame } from '../../context/GameContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 220;
const NODE_SIZE = 36;

interface Props {
  nodes: ZoneNode[];
  onNodePress: (node: ZoneNode) => void;
}

export default function ZoneMap({ nodes, onNodePress }: Props) {
  const { state } = useGame();
  const currentNode = nodes.find((n) => n.id === state.currentNodeId);

  const getNodeColor = (node: ZoneNode) => {
    if (node.id === state.currentNodeId) return colors.neonGreen;
    if (state.visitedNodes.includes(node.id)) return colors.neonCyan;
    if (isReachable(node)) return colors.neonAmber;
    if (isRevealed(node)) return colors.textMuted;
    return colors.surfaceLight;
  };

  const isReachable = (node: ZoneNode) => {
    if (!currentNode) return false;
    return currentNode.connections.includes(node.id);
  };

  const isRevealed = (node: ZoneNode) => {
    return node.isRevealed || state.visitedNodes.includes(node.id) || isReachable(node);
  };

  const getNodeIcon = (node: ZoneNode) => {
    switch (node.type) {
      case 'hub':
        return '🏠';
      case 'settlement':
        return '🏪';
      case 'encounter':
        return '⚔️';
      case 'waypoint':
        return '📍';
      case 'boss':
        return '💀';
      default:
        return '●';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        {/* Connection lines */}
        {nodes.map((node) =>
          node.connections.map((connId) => {
            const connNode = nodes.find((n) => n.id === connId);
            if (!connNode) return null;
            if (!isRevealed(node) && !isRevealed(connNode)) return null;
            // Only draw line once (from lower to higher index)
            if (nodes.indexOf(node) > nodes.indexOf(connNode)) return null;

            const x1 = (node.x / 100) * (SCREEN_WIDTH - 64) + NODE_SIZE / 2;
            const y1 = (node.y / 100) * MAP_HEIGHT;
            const x2 = (connNode.x / 100) * (SCREEN_WIDTH - 64) + NODE_SIZE / 2;
            const y2 = (connNode.y / 100) * MAP_HEIGHT;
            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

            return (
              <View
                key={`line-${node.id}-${connId}`}
                style={[
                  styles.line,
                  {
                    left: x1,
                    top: y1 + NODE_SIZE / 2,
                    width: length,
                    transform: [{ rotate: `${angle}deg` }],
                    backgroundColor:
                      state.visitedNodes.includes(node.id) &&
                      state.visitedNodes.includes(connId)
                        ? colors.neonCyan + '40'
                        : colors.surfaceLight,
                  },
                ]}
              />
            );
          })
        )}

        {/* Nodes */}
        {nodes.map((node) => {
          if (!isRevealed(node)) {
            return (
              <View
                key={node.id}
                style={[
                  styles.node,
                  styles.hiddenNode,
                  {
                    left: (node.x / 100) * (SCREEN_WIDTH - 64),
                    top: (node.y / 100) * MAP_HEIGHT,
                  },
                ]}
              >
                <Text style={styles.hiddenIcon}>?</Text>
              </View>
            );
          }

          const nodeColor = getNodeColor(node);
          const isCurrent = node.id === state.currentNodeId;
          const reachable = isReachable(node);

          return (
            <TouchableOpacity
              key={node.id}
              disabled={!reachable && !isCurrent}
              onPress={() => onNodePress(node)}
              style={[
                styles.node,
                {
                  left: (node.x / 100) * (SCREEN_WIDTH - 64),
                  top: (node.y / 100) * MAP_HEIGHT,
                  borderColor: nodeColor,
                  backgroundColor: isCurrent ? nodeColor + '30' : colors.surface,
                },
                isCurrent && styles.currentNode,
              ]}
            >
              <Text style={styles.nodeIcon}>{getNodeIcon(node)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Current location label */}
      {currentNode && (
        <View style={styles.locationBar}>
          <Text style={styles.locationIcon}>{getNodeIcon(currentNode)}</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{currentNode.name}</Text>
            <Text style={styles.locationDesc} numberOfLines={1}>
              {currentNode.description}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  mapArea: {
    height: MAP_HEIGHT + NODE_SIZE + 10,
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    overflow: 'hidden',
  },
  line: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  node: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenNode: {
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surfaceHighlight,
    borderStyle: 'dashed',
  },
  currentNode: {
    shadowColor: colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  nodeIcon: {
    fontSize: 16,
  },
  hiddenIcon: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '700',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neonGreen + '30',
  },
  locationIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neonGreen,
  },
  locationDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
