-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: billing
-- ------------------------------------------------------
-- Server version	5.5.5-10.6.22-MariaDB-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `code_actions`
--

DROP TABLE IF EXISTS `code_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `code_actions` (
  `code` varchar(10) NOT NULL,
  `source` enum('CMS_HCPCS','AMA_CPT') NOT NULL,
  `version` varchar(32) NOT NULL,
  `action` varchar(32) NOT NULL,
  `details` varchar(255) DEFAULT NULL,
  `eff_start` date DEFAULT NULL,
  `eff_end` date DEFAULT NULL,
  PRIMARY KEY (`code`,`source`,`version`,`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `code_descriptions`
--

DROP TABLE IF EXISTS `code_descriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `code_descriptions` (
  `code` varchar(10) NOT NULL,
  `source` enum('CMS_HCPCS','AMA_CPT','INTERNAL') NOT NULL,
  `version` varchar(32) NOT NULL,
  `short_desc` varchar(255) NOT NULL,
  `long_desc` text NOT NULL,
  `eff_start` date DEFAULT NULL,
  `eff_end` date DEFAULT NULL,
  PRIMARY KEY (`code`,`source`,`version`),
  KEY `cd_code_only` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `codes`
--

DROP TABLE IF EXISTS `codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `codes` (
  `code` varchar(10) NOT NULL,
  `code_type` enum('CPT','HCPCS') NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `eff_start` date DEFAULT NULL,
  `eff_end` date DEFAULT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doc_notes`
--

DROP TABLE IF EXISTS `doc_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doc_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `cy` smallint(6) NOT NULL,
  `note_text` varchar(1000) NOT NULL,
  `priority` tinyint(4) DEFAULT 5,
  PRIMARY KEY (`id`),
  KEY `code` (`code`,`cy`),
  CONSTRAINT `fk_dn_code` FOREIGN KEY (`code`) REFERENCES `codes` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hcpcs_meta`
--

DROP TABLE IF EXISTS `hcpcs_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hcpcs_meta` (
  `code` varchar(10) NOT NULL,
  `version` varchar(16) NOT NULL,
  `betos` varchar(8) DEFAULT NULL,
  `tos1` varchar(8) DEFAULT NULL,
  `tos2` varchar(8) DEFAULT NULL,
  `tos3` varchar(8) DEFAULT NULL,
  `tos4` varchar(8) DEFAULT NULL,
  `tos5` varchar(8) DEFAULT NULL,
  `opps` varchar(32) DEFAULT NULL,
  `opps_pi` varchar(8) DEFAULT NULL,
  `opps_dt` date DEFAULT NULL,
  `asc_grp` varchar(16) DEFAULT NULL,
  `asc_dt` date DEFAULT NULL,
  `anest_bu` decimal(6,2) DEFAULT NULL,
  `cov` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`code`,`version`),
  KEY `hm_code_only` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hcpcs_raw`
--

DROP TABLE IF EXISTS `hcpcs_raw`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hcpcs_raw` (
  `version` varchar(16) NOT NULL,
  `hcpc` varchar(10) NOT NULL,
  `seqnum` varchar(8) DEFAULT NULL,
  `recid` varchar(8) DEFAULT NULL,
  `long_desc` text DEFAULT NULL,
  `short_desc` varchar(255) DEFAULT NULL,
  `price1` decimal(12,2) DEFAULT NULL,
  `price2` decimal(12,2) DEFAULT NULL,
  `price3` decimal(12,2) DEFAULT NULL,
  `price4` decimal(12,2) DEFAULT NULL,
  `mult_pi` varchar(8) DEFAULT NULL,
  `cim1` varchar(16) DEFAULT NULL,
  `cim2` varchar(16) DEFAULT NULL,
  `cim3` varchar(16) DEFAULT NULL,
  `mcm1` varchar(16) DEFAULT NULL,
  `mcm2` varchar(16) DEFAULT NULL,
  `mcm3` varchar(16) DEFAULT NULL,
  `statute` varchar(64) DEFAULT NULL,
  `labcert1` varchar(8) DEFAULT NULL,
  `labcert2` varchar(8) DEFAULT NULL,
  `labcert3` varchar(8) DEFAULT NULL,
  `labcert4` varchar(8) DEFAULT NULL,
  `labcert5` varchar(8) DEFAULT NULL,
  `labcert6` varchar(8) DEFAULT NULL,
  `labcert7` varchar(8) DEFAULT NULL,
  `labcert8` varchar(8) DEFAULT NULL,
  `xref1` varchar(10) DEFAULT NULL,
  `xref2` varchar(10) DEFAULT NULL,
  `xref3` varchar(10) DEFAULT NULL,
  `xref4` varchar(10) DEFAULT NULL,
  `xref5` varchar(10) DEFAULT NULL,
  `cov` varchar(8) DEFAULT NULL,
  `asc_grp` varchar(16) DEFAULT NULL,
  `asc_dt` date DEFAULT NULL,
  `opps` varchar(32) DEFAULT NULL,
  `opps_pi` varchar(8) DEFAULT NULL,
  `opps_dt` date DEFAULT NULL,
  `procnote` varchar(64) DEFAULT NULL,
  `betos` varchar(8) DEFAULT NULL,
  `tos1` varchar(8) DEFAULT NULL,
  `tos2` varchar(8) DEFAULT NULL,
  `tos3` varchar(8) DEFAULT NULL,
  `tos4` varchar(8) DEFAULT NULL,
  `tos5` varchar(8) DEFAULT NULL,
  `anest_bu` decimal(6,2) DEFAULT NULL,
  `add_dt` date DEFAULT NULL,
  `act_eff_dt` date DEFAULT NULL,
  `term_dt` date DEFAULT NULL,
  `action_cd` varchar(4) DEFAULT NULL,
  `loaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`version`,`hcpc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicare_fee`
--

DROP TABLE IF EXISTS `medicare_fee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicare_fee` (
  `code` varchar(10) NOT NULL,
  `cy` smallint(6) NOT NULL,
  `place` enum('nonfacility','facility') NOT NULL DEFAULT 'nonfacility',
  `allowed_amount` decimal(10,2) NOT NULL,
  `is_placeholder` tinyint(1) DEFAULT 1,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`code`,`cy`,`place`),
  CONSTRAINT `fk_mf_code` FOREIGN KEY (`code`) REFERENCES `codes` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicare_fee_locality`
--

DROP TABLE IF EXISTS `medicare_fee_locality`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicare_fee_locality` (
  `code` varchar(10) NOT NULL,
  `cy` smallint(6) NOT NULL,
  `mac_code` char(5) NOT NULL,
  `locality_number` varchar(4) NOT NULL,
  `place` enum('nonfacility','facility') NOT NULL,
  `allowed_amount` decimal(10,2) NOT NULL,
  `modifier` varchar(4) NOT NULL DEFAULT '',
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`code`,`cy`,`mac_code`,`locality_number`,`place`,`modifier`),
  KEY `idx_loc_query` (`cy`,`mac_code`,`locality_number`,`place`,`code`),
  CONSTRAINT `fk_mfl_code` FOREIGN KEY (`code`) REFERENCES `codes` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicare_fee_raw`
--

DROP TABLE IF EXISTS `medicare_fee_raw`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicare_fee_raw` (
  `cy` smallint(6) NOT NULL,
  `mac_code` char(5) NOT NULL,
  `locality_number` varchar(4) NOT NULL,
  `hcpcs` varchar(10) NOT NULL,
  `modifier` varchar(4) NOT NULL DEFAULT '',
  `nonfacility_amt` decimal(10,2) NOT NULL,
  `facility_amt` decimal(10,2) NOT NULL,
  `status_ind` varchar(8) DEFAULT NULL,
  `global_surg` varchar(8) DEFAULT NULL,
  `opps_ind` varchar(8) DEFAULT NULL,
  `extra1` varchar(16) DEFAULT NULL,
  `extra2` varchar(16) DEFAULT NULL,
  PRIMARY KEY (`cy`,`mac_code`,`locality_number`,`hcpcs`,`modifier`),
  KEY `idx_raw_hcpcs` (`hcpcs`,`cy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payer_overrides`
--

DROP TABLE IF EXISTS `payer_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payer_overrides` (
  `payer_id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `cy` smallint(6) NOT NULL,
  `place` enum('nonfacility','facility') NOT NULL DEFAULT 'nonfacility',
  `amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`payer_id`,`code`,`cy`,`place`),
  KEY `fk_po_code` (`code`),
  CONSTRAINT `fk_po_code` FOREIGN KEY (`code`) REFERENCES `codes` (`code`) ON DELETE CASCADE,
  CONSTRAINT `fk_po_payer` FOREIGN KEY (`payer_id`) REFERENCES `payers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payers`
--

DROP TABLE IF EXISTS `payers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `kind` enum('medicare_original','medicare_advantage','commercial','cash') DEFAULT 'medicare_original',
  `multiplier` decimal(6,4) DEFAULT 1.0000,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_pfs_national_agg`
--

DROP TABLE IF EXISTS `v_pfs_national_agg`;
/*!50001 DROP VIEW IF EXISTS `v_pfs_national_agg`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_pfs_national_agg` AS SELECT 
 1 AS `cy`,
 1 AS `code`,
 1 AS `nf_amount`,
 1 AS `f_amount`,
 1 AS `n_localities`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `workflow_codes`
--

DROP TABLE IF EXISTS `workflow_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_codes` (
  `workflow_id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `is_base` tinyint(1) DEFAULT 0,
  `display_order` int(11) DEFAULT 0,
  PRIMARY KEY (`workflow_id`,`code`),
  KEY `fk_wc_code` (`code`),
  CONSTRAINT `fk_wc_code` FOREIGN KEY (`code`) REFERENCES `codes` (`code`),
  CONSTRAINT `fk_wc_wf` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflows`
--

DROP TABLE IF EXISTS `workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slug` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `v_pfs_national_agg`
--

/*!50001 DROP VIEW IF EXISTS `v_pfs_national_agg`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`semantic_admin`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_pfs_national_agg` AS select `mfr`.`cy` AS `cy`,`mfr`.`hcpcs` AS `code`,round(avg(`mfr`.`nonfacility_amt`),2) AS `nf_amount`,round(avg(`mfr`.`facility_amt`),2) AS `f_amount`,count(distinct concat(`mfr`.`mac_code`,':',`mfr`.`locality_number`)) AS `n_localities` from `medicare_fee_raw` `mfr` where `mfr`.`modifier` = '' and (`mfr`.`nonfacility_amt` > 0 or `mfr`.`facility_amt` > 0) group by `mfr`.`cy`,`mfr`.`hcpcs` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-09 15:11:52
