import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity.js';
import { OrderStatus } from '../../../common/enums/order-status.enum.js';
import { SortOrder } from '../../../common/dto/pagination.dto.js';

export interface RawSalesSummary {
  totalOrders: string;
  totalRevenue: string;
  totalTicketsSold: string;
}

export interface RawRankedItem {
  id: string;
  name: string;
  totalRevenue: string;
  totalOrders: string;
}

@Injectable()
export class OrderAnalyticsRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async getSalesSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<RawSalesSummary> {
    return (await this.repo
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(order.quantity), 0)', 'totalTicketsSold')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne()) as RawSalesSummary;
  }

  async getTopEvents(
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<RawRankedItem[]> {
    return this.repo
      .createQueryBuilder('order')
      .innerJoin('order.event', 'event')
      .select('event.id', 'id')
      .addSelect('event.title', 'name')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalRevenue')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('event.id')
      .addGroupBy('event.title')
      .orderBy('"totalRevenue"', SortOrder.DESC)
      .limit(limit)
      .getRawMany();
  }

  async getTopCategories(
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<RawRankedItem[]> {
    return this.repo
      .createQueryBuilder('order')
      .innerJoin('order.event', 'event')
      .innerJoin('event.category', 'category')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalRevenue')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('"totalRevenue"', SortOrder.DESC)
      .limit(limit)
      .getRawMany();
  }

  async findPaidOrdersBetween(
    startDate: Date,
    endDate: Date,
  ): Promise<Order[]> {
    return this.repo.find({
      where: {
        status: OrderStatus.PAID,
        createdAt: Between(startDate, endDate),
      },
      relations: { event: true, user: true },
      order: { createdAt: SortOrder.ASC },
    });
  }
}
