import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'DIRECTOR', 'COORDINATOR')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DIRECTOR', 'COORDINATOR')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'DIRECTOR', 'COORDINATOR')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.create(dto, user.userId, user.role);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DIRECTOR', 'COORDINATOR')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.update(id, dto, user.userId, user.role);
  }

  @Delete(':id')
  @Roles('ADMIN', 'DIRECTOR', 'COORDINATOR')
  softDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.softDelete(id, user.userId);
  }
}