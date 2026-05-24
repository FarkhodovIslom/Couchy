import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { GraphService } from '../../core/graph/graph.service';

@Controller('graph')
export class GraphController {
  constructor(private readonly graph: GraphService) {}

  @Get('snapshot')
  getSnapshot() {
    return { nodes: this.graph.getAllNodes(), edges: this.graph.getAllEdges() };
  }

  @Get('node/:nodeId')
  getNode(@Param('nodeId') nodeId: string) {
    const node = this.graph.getNode(nodeId);
    if (!node) throw new NotFoundException(`Node "${nodeId}" not found`);
    const neighbors = this.graph.getNeighbors(nodeId);
    return { node, neighbors };
  }
}
