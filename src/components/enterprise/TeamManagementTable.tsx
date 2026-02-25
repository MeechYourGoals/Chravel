import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { MoreHorizontal, Mail, Trash2, Edit, UserCheck, UserX, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RosterMember } from '../../types/enterprise';

interface TeamManagementTableProps {
  members: RosterMember[];
  selectedMembers: string[];
  onMemberSelect: (memberId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEditMember: (member: RosterMember) => void;
  onDeleteMember: (memberId: string) => void;
  onResendInvite: (memberId: string) => void;
}

export const TeamManagementTable = ({
  members,
  selectedMembers,
  onMemberSelect,
  onSelectAll,
  onEditMember,
  onDeleteMember,
  onResendInvite,
}: TeamManagementTableProps) => {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/20 bg-white/5">
        <Table>
          <TableHeader>
            <TableRow className="border-white/20 hover:bg-white/5">
              <TableHead className="w-12">
                <Checkbox className="border-white/30" />
              </TableHead>
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Role</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(member => (
              <TableRow key={member.id} className="border-white/20 hover:bg-white/5">
                <TableCell>
                  <Checkbox className="border-white/30" />
                </TableCell>
                <TableCell className="text-white font-medium">{member.name}</TableCell>
                <TableCell className="text-gray-300">{member.role}</TableCell>
                <TableCell>
                  <Badge className="bg-green-500/20 text-green-300">Active</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
