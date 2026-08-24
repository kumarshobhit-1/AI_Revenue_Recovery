import { dbService } from './dbService.js';
import { RecoveryCase } from '../models/RecoveryCase.js';

export const outcomeService = {
  // Resolves the outcome of a recovery case (SUCCESS -> RECOVERED, FAILURE -> FAILED).
  async resolveOutcome(caseId, outcome = 'SUCCESS', notes = '') {
    const recoveryCase = await dbService.getRecoveryCaseById(caseId);
    if (!recoveryCase) {
      throw new Error(`Case ${caseId} not found for outcome resolution`);
    }

    const customer = await dbService.findOrCreateCustomer({
      customerId: recoveryCase.customerId,
      merchantId: recoveryCase.merchantId,
    });

    const isSuccess = outcome.toUpperCase() === 'SUCCESS';

    if (isSuccess) {
      const recoveredAmount = recoveryCase.amount;
      recoveryCase.recoveredAmount = recoveredAmount;
      if (dbService.isDbConnected && dbService.isDbConnected()) {
        await recoveryCase.save();
      }

      // Update payment entity status to RECOVERED (Phase 1)
      const payment = await dbService.getPaymentById(recoveryCase.paymentId);
      if (payment) {
        await dbService.updatePaymentStatus(recoveryCase.paymentId, 'RECOVERED');
      }

      // Update customer stats
      customer.successfulTxnCount = (customer.successfulTxnCount || 0) + 1;
      customer.ltv = (customer.ltv || 0) + recoveredAmount;
      if (dbService.isDbConnected && dbService.isDbConnected()) {
        await customer.save();
      }

      await dbService.updateCaseState(
        caseId,
        'RECOVERED',
        `Payment recovered successfully! Recovered Amount: ${recoveryCase.currency} ${recoveredAmount}.${notes ? ` Notes: ${notes}` : ''}`,
        'SYSTEM',
        { recoveredAmount, outcome: 'SUCCESS' }
      );
    } else {
      customer.failedTxnCount = (customer.failedTxnCount || 0) + 1;
      if (dbService.isDbConnected && dbService.isDbConnected()) {
        await customer.save();
      }

      await dbService.updateCaseState(
        caseId,
        'FAILED',
        `Payment recovery attempt failed.${notes ? ` Reason: ${notes}` : ''}`,
        'SYSTEM',
        { outcome: 'FAILURE' }
      );
    }

    const updatedCase = await dbService.getRecoveryCaseById(caseId);
    return {
      recoveryCase: updatedCase,
      outcome: isSuccess ? 'SUCCESS' : 'FAILURE',
    };
  },

  // Calculates aggregated financial batch metrics for merchant dashboard.
  async getBatchRecoveryMetrics(merchantId = 'mer_default') {
    let cases = [];

    if (dbService.isDbConnected && dbService.isDbConnected()) {
      cases = await RecoveryCase.find({ merchantId });
    } else {
      const { cases: memCases } = await dbService.listRecoveryCases({ merchantId }, 1, 1000);
      cases = memCases;
    }

    let totalRevenueAtRisk = 0;
    let totalRevenueRecovered = 0;
    let recoveredCasesCount = 0;
    let failedCasesCount = 0;
    let escalatedCasesCount = 0;
    let stoppedCasesCount = 0;
    let activeCasesCount = 0;

    cases.forEach((c) => {
      totalRevenueAtRisk += Number(c.revenueAtRisk) || 0;
      if (c.state === 'RECOVERED') {
        totalRevenueRecovered += Number(c.recoveredAmount) || 0;
        recoveredCasesCount += 1;
      } else if (c.state === 'FAILED') {
        failedCasesCount += 1;
      } else if (c.state === 'ESCALATED') {
        escalatedCasesCount += 1;
      } else if (c.state === 'STOPPED') {
        stoppedCasesCount += 1;
      } else {
        activeCasesCount += 1;
      }
    });

    const totalCases = cases.length;
    const recoveryRate = totalRevenueAtRisk > 0 ? Number(((totalRevenueRecovered / totalRevenueAtRisk) * 100).toFixed(2)) : 0;

    return {
      totalRevenueAtRisk,
      totalRevenueRecovered,
      recoveryRate,
      totalCases,
      recoveredCasesCount,
      failedCasesCount,
      escalatedCasesCount,
      stoppedCasesCount,
      activeCasesCount,
    };
  },
};
