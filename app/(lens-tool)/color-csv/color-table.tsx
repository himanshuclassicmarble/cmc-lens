import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProcessedImageResult } from "./types";

interface ColorTableProps {
  results: ProcessedImageResult[];
}

export default function ColorTable({ results }: ColorTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lot No</TableHead>
          <TableHead>HEX</TableHead>
          <TableHead>RGB</TableHead>
          <TableHead>HSL</TableHead>
          <TableHead>CMYK</TableHead>
          <TableHead>LAB</TableHead>
          <TableHead>Coverage</TableHead>
          <TableHead>Color</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result, idx) => (
          <TableRow key={idx}>
            <TableCell>{result.lotNo}</TableCell>
            <TableCell>{result.hex}</TableCell>
            <TableCell>({result.rgb.join(", ")})</TableCell>
            <TableCell>({result.hsl.join(", ")})</TableCell>
            <TableCell>({result.cmyk.join(", ")})</TableCell>
            <TableCell>({result.lab.join(", ")})</TableCell>
            <TableCell>
              <Badge variant="outline">{result.cov}%</Badge>
            </TableCell>
            <TableCell>
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: result.hex,
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  display: "inline-block",
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
