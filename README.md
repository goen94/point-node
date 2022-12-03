## Commands

Running locally:

```bash
yarn dev
```

Running in production:

```bash
yarn start
```

Testing:

```bash
# run all tests
yarn test

# run all tests in watch mode
yarn test:watch

# run test coverage
yarn coverage
```

Linting:

```bash
# run ESLint
yarn lint

# fix ESLint errors
yarn lint:fix

# run prettier
yarn prettier

# fix prettier errors
yarn prettier:fix
```

## Todo
- Deployment -> https://ourcodeworld.com/articles/read/977/how-to-deploy-a-node-js-application-on-aws-ec2-server

&nbsp;

- Need to fix bug sales visitation expiry date. Sales visitation expiry date not equal to inventory expiry date

&nbsp;

- add new permission 'menu setting', 'update setting'
```
INSERT INTO `permissions` (`name`, `guard_name`) VALUES (`menu setting`, `api`, now(), now());

INSERT INTO `permissions` (`name`, `guard_name`) VALUES (`update setting`, `api`, now(), now());
```

&nbsp;

- create migration for alter sales_invoices table
```
ALTER TABLE `sales_invoices`
ADD `referenceable_id` int(10) unsigned NOT NULL,
ADD `referenceable_type` varchar(191) NOT NULL;
```

&nbsp;

- create migration for alter sales_invoice_items table
```
ALTER TABLE `sales_invoice_items` DROP COLUMN `delivery_note_item_id`;

ALTER TABLE `sales_invoice_items` DROP COLUMN `delivery_note_id`;

ALTER TABLE `sales_invoice_items`
  ADD `production_number` VARCHAR(191),
  ADD `expiry_date` DATETIME,
  ADD `referenceable_id` int(10) unsigned NOT NULL,
  ADD `referenceable_type` varchar(191) NOT NULL,
  ADD `item_referenceable_id` int(10) unsigned NOT NULL,
  ADD `item_referenceable_type` varchar(191) NOT NULL,
  ADD `quantity_returned` decimal(65,30) default 0.000000000000000000000000000000 AFTER `quantity`,
  ADD `quantity_remaining` decimal(65,30) default 0.000000000000000000000000000000 AFTER `quantity_returned`;
```

&nbsp;

- create migration to create table setting_logos
```
CREATE TABLE `setting_logos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `path` varchar(191) NOT NULL,
  `public_url` varchar(191) NOT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

```

&nbsp;

- create migration for create table setting_end_notes
```
CREATE TABLE `setting_end_notes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `purchase_request` varchar(255) DEFAULT NULL,
  `purchase_order` varchar(255) DEFAULT NULL,
  `purchase_down_payment` varchar(255) DEFAULT NULL,
  `purchase_receive` varchar(255) DEFAULT NULL,
  `purchase_invoice` varchar(255) DEFAULT NULL,
  `purchase_return` varchar(255) DEFAULT NULL,
  `payment_order_purchase` varchar(255) DEFAULT NULL,
  `point_of_sales` varchar(255) DEFAULT NULL,
  `sales_quotation` varchar(255) DEFAULT NULL,
  `sales_order` varchar(255) DEFAULT NULL,
  `sales_down_payment` varchar(255) DEFAULT NULL,
  `sales_invoice` varchar(255) DEFAULT NULL,
  `sales_return` varchar(255) DEFAULT NULL,
  `payment_collection_sales` varchar(255) DEFAULT NULL,
  `expedition_order` varchar(255) DEFAULT NULL,
  `expedition_down_payment` varchar(255) DEFAULT NULL,
  `expedition_invoice` varchar(255) DEFAULT NULL,
  `payment_order_expedition` varchar(255) DEFAULT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

```